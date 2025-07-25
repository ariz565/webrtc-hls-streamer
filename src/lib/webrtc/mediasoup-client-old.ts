import { Device } from "mediasoup-client";
import { io, Socket } from "socket.io  private async loadDevice(rtpCapabilities: any): Promise<void> {
    try {
      if (!this.device) {
        this.device = new Device();
      }
      await this.device.load({ routerRtpCapabilities: rtpCapabilities });
      console.log('Device loaded with RTP capabilities');
    } catch (error) {
      console.error('Error loading device:', error);
      throw error;
    }
  }

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

    this.socket.on("routerRtpCapabilities", async (data) => {
      await this.loadDevice(data.rtpCapabilities);
    });

    this.socket.on("producerTransportCreated", (data) => {
      this.createSendTransport(data);
    });

    this.socket.on("consumerTransportCreated", (data) => {
      this.createRecvTransport(data);
    });

    this.socket.on("newProducer", (data) => {
      this.consume(data.producerId);
    });

    this.socket.on("newConsumer", (data) => {
      this.handleNewConsumer(data);
    });
  }

  async joinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit("joinRoom", { roomId }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.roomClient = {
            id: this.socket.id!,
            device: this.device,
            socket: this.socket,
            isConnected: true,
          };
          resolve();
        }
      });
    });
  }

  private async loadDevice(rtpCapabilities: any): Promise<void> {
    try {
      await this.device.load({ routerRtpCapabilities: rtpCapabilities });
      console.log("Device loaded with RTP capabilities");
    } catch (error) {
      console.error("Error loading device:", error);
      throw error;
    }
  }

  private async createSendTransport(transportInfo: any): Promise<void> {
    try {
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
    this.socket.emit("consume", {
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
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
      this.socket.emit("resumeConsumer", { consumerId: consumer.id });

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
    this.socket.emit("createProducerTransport");
  }

  async createConsumerTransport(): Promise<void> {
    this.socket.emit("createConsumerTransport");
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
}
