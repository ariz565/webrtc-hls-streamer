import { Device } from "mediasoup-client";
import { io, Socket } from "socket.io-client";

export interface RoomClient {
  id: string;
  device: Device;
  socket: Socket;
  isConnected: boolean;
  sendTransport?: any;
  recvTransport?: any;
}

export class MediasoupClient {
  private static instance: MediasoupClient;
  private device: Device | null = null;
  private socket: Socket;
  private roomClient: RoomClient | null = null;
  private producers: Map<string, any> = new Map();
  private consumers: Map<string, any> = new Map();
  private isDeviceLoaded = false;

  private constructor() {
    this.socket = io("http://localhost:3001");
    this.setupSocketHandlers();
  }

  static getInstance(): MediasoupClient {
    if (!MediasoupClient.instance) {
      MediasoupClient.instance = new MediasoupClient();
    }
    return MediasoupClient.instance;
  }

  private setupSocketHandlers(): void {
    this.socket.on("connect", () => {
      console.log("Connected to signaling server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from signaling server");
      this.cleanup();
    });

    this.socket.on("routerRtpCapabilities", async (data: any) => {
      await this.loadDevice(data.rtpCapabilities);
    });

    this.socket.on("producerTransportCreated", (data: any) => {
      this.createSendTransport(data);
    });

    this.socket.on("consumerTransportCreated", (data: any) => {
      this.createRecvTransport(data);
    });

    this.socket.on("newProducer", (data: any) => {
      console.log("New producer detected:", data);
      this.consume(data.producerId);
    });

    this.socket.on("newConsumer", (data: any) => {
      this.handleNewConsumer(data);
    });

    // Enhanced participant management
    this.socket.on("participantJoined", (data: any) => {
      console.log("Participant joined:", data);
      window.dispatchEvent(
        new CustomEvent("participantJoined", { detail: data })
      );
    });

    this.socket.on("participantLeft", (data: any) => {
      console.log("Participant left:", data);
      window.dispatchEvent(
        new CustomEvent("participantLeft", { detail: data })
      );
    });

    this.socket.on("participantUpdate", (data: any) => {
      console.log("Participant update:", data);
      window.dispatchEvent(
        new CustomEvent("participantUpdate", { detail: data })
      );
    });
  }

  async joinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit("joinRoom", { roomId }, async (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          try {
            // Initialize device with RTP capabilities
            await this.loadDevice(response.rtpCapabilities);
            
            if (this.device) {
              this.roomClient = {
                id: this.socket.id!,
                device: this.device,
                socket: this.socket,
                isConnected: true,
              };

              // Create both transports after device is loaded
              await Promise.all([
                this.createProducerTransport(),
                this.createConsumerTransport()
              ]);

              resolve();
            } else {
              reject(new Error("Failed to initialize device"));
            }
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  private async loadDevice(rtpCapabilities: any): Promise<void> {
    try {
      if (!this.device) {
        this.device = new Device();
      }

      if (!this.isDeviceLoaded) {
        await this.device.load({ routerRtpCapabilities: rtpCapabilities });
        this.isDeviceLoaded = true;
        console.log("Device loaded with RTP capabilities");
      }
    } catch (error) {
      console.error("Error loading device:", error);
      throw error;
    }
  }

  private async createSendTransport(transportInfo: any): Promise<void> {
    try {
      if (!this.device) {
        throw new Error("Device not initialized");
      }

      const transport = this.device.createSendTransport({
        id: transportInfo.id,
        iceParameters: transportInfo.iceParameters,
        iceCandidates: transportInfo.iceCandidates,
        dtlsParameters: transportInfo.dtlsParameters,
        sctpParameters: transportInfo.sctpParameters,
      });

      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        this.socket.emit(
          "connectTransport",
          {
            transportId: transport.id,
            dtlsParameters,
          },
          (response: any) => {
            if (response.error) {
              errback(new Error(response.error));
            } else {
              callback();
            }
          }
        );
      });

      transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
        this.socket.emit(
          "produce",
          {
            transportId: transport.id,
            kind,
            rtpParameters,
          },
          (response: any) => {
            if (response.error) {
              errback(new Error(response.error));
            } else {
              callback({ id: response.producerId });
            }
          }
        );
      });

      if (this.roomClient) {
        this.roomClient.sendTransport = transport;
      }
    } catch (error) {
      console.error("Error creating send transport:", error);
      throw error;
    }
  }

  private async createRecvTransport(transportInfo: any): Promise<void> {
    try {
      if (!this.device) {
        throw new Error("Device not initialized");
      }

      const transport = this.device.createRecvTransport({
        id: transportInfo.id,
        iceParameters: transportInfo.iceParameters,
        iceCandidates: transportInfo.iceCandidates,
        dtlsParameters: transportInfo.dtlsParameters,
        sctpParameters: transportInfo.sctpParameters,
      });

      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        this.socket.emit(
          "connectTransport",
          {
            transportId: transport.id,
            dtlsParameters,
          },
          (response: any) => {
            if (response.error) {
              errback(new Error(response.error));
            } else {
              callback();
            }
          }
        );
      });

      if (this.roomClient) {
        this.roomClient.recvTransport = transport;
      }
    } catch (error) {
      console.error("Error creating recv transport:", error);
      throw error;
    }
  }

  async produce(track: MediaStreamTrack): Promise<void> {
    if (!this.roomClient?.sendTransport) {
      throw new Error("Send transport not available");
    }

    try {
      const producer = await this.roomClient.sendTransport.produce({ track });
      this.producers.set(producer.id, producer);

      producer.on("transportclose", () => {
        this.producers.delete(producer.id);
      });

      console.log("Producer created:", producer.id);
    } catch (error) {
      console.error("Error producing:", error);
      throw error;
    }
  }

  private async consume(producerId: string): Promise<void> {
    if (!this.device) {
      throw new Error("Device not initialized");
    }

    if (!this.roomClient?.recvTransport) {
      console.error("Recv transport not available for consuming");
      return;
    }

    this.socket.emit("consume", {
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
      transportId: this.roomClient.recvTransport.id,
    }, (response: any) => {
      if (response.error) {
        console.error("Error consuming:", response.error);
      } else {
        this.handleNewConsumer(response);
      }
    });
  }

  private async handleNewConsumer(data: any): Promise<void> {
    if (!this.roomClient?.recvTransport) {
      console.error("Recv transport not available");
      return;
    }

    try {
      const consumer = await this.roomClient.recvTransport.consume({
        id: data.id,
        producerId: data.producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      });

      this.consumers.set(consumer.id, consumer);

      consumer.on("transportclose", () => {
        this.consumers.delete(consumer.id);
      });

      // Resume the consumer
      this.socket.emit("resumeConsumer", { consumerId: consumer.id }, (response: any) => {
        if (response.error) {
          console.error("Error resuming consumer:", response.error);
        } else {
          console.log("Consumer resumed successfully");
        }
      });

      console.log("Consumer created:", consumer.id);

      // Emit event for UI to handle new remote stream
      window.dispatchEvent(
        new CustomEvent("newRemoteStream", {
          detail: { track: consumer.track, consumerId: consumer.id },
        })
      );
    } catch (error) {
      console.error("Error consuming:", error);
    }
  }

  async createProducerTransport(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit("createProducerTransport", (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          // Create the send transport with the received info
          this.createSendTransport(response)
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async createConsumerTransport(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit("createConsumerTransport", (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          // Create the recv transport with the received info
          this.createRecvTransport(response)
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  leaveRoom(): void {
    if (this.roomClient) {
      this.socket.emit("leaveRoom");
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.producers.forEach((producer) => producer.close());
    this.consumers.forEach((consumer) => consumer.close());
    this.producers.clear();
    this.consumers.clear();

    if (this.roomClient) {
      this.roomClient.sendTransport?.close();
      this.roomClient.recvTransport?.close();
      this.roomClient.isConnected = false;
      this.roomClient = null;
    }
  }

  getSocket(): Socket {
    return this.socket;
  }

  isConnected(): boolean {
    return this.roomClient?.isConnected ?? false;
  }

  closeProducer(kind: "audio" | "video"): void {
    this.producers.forEach((producer, id) => {
      if (producer.kind === kind) {
        producer.close();
        this.producers.delete(id);
        console.log(`Closed ${kind} producer:`, id);
      }
    });
  }
}
