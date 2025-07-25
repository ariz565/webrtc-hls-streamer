import * as mediasoup from "mediasoup";
import { config } from "../config/mediasoup";

export class MediasoupWorker {
  private static instance: MediasoupWorker;
  private worker: any | null = null;
  private router: any | null = null;

  private constructor() {}

  static getInstance(): MediasoupWorker {
    if (!MediasoupWorker.instance) {
      MediasoupWorker.instance = new MediasoupWorker();
    }
    return MediasoupWorker.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create worker
      this.worker = await mediasoup.createWorker({
        logLevel: config.worker.logLevel,
        logTags: config.worker.logTags,
        rtcMinPort: config.worker.rtcMinPort,
        rtcMaxPort: config.worker.rtcMaxPort,
      });

      this.worker.on("died", () => {
        console.error(
          "Mediasoup worker died, exiting in 2 seconds... [pid:%d]",
          this.worker?.pid
        );
        setTimeout(() => process.exit(1), 2000);
      });

      // Create router
      this.router = await this.worker.createRouter({
        mediaCodecs: config.router.mediaCodecs,
      });

      console.log("Mediasoup worker and router created successfully");
    } catch (error) {
      console.error("Failed to initialize mediasoup worker:", error);
      throw error;
    }
  }

  async createWebRtcTransport(): Promise<any> {
    if (!this.router) {
      throw new Error("Router not initialized");
    }

    try {
      const transport = await this.router.createWebRtcTransport({
        listenIps: config.webRtcTransport.listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        appData: {},
      });

      transport.on("dtlsstatechange", (dtlsState: string) => {
        if (dtlsState === "closed") {
          transport.close();
        }
      });

      transport.on("close", () => {
        console.log("Transport closed");
      });

      return transport;
    } catch (error) {
      console.error("Error creating WebRTC transport:", error);
      throw error;
    }
  }

  async connectTransport(transport: any, dtlsParameters: any): Promise<void> {
    try {
      await transport.connect({ dtlsParameters });
    } catch (error) {
      console.error("Error connecting transport:", error);
      throw error;
    }
  }

  async createProducer(
    transport: any,
    rtpParameters: any,
    kind: "audio" | "video"
  ): Promise<any> {
    try {
      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: {},
      });

      producer.on("transportclose", () => {
        console.log("Producer transport closed");
        producer.close();
      });

      return producer;
    } catch (error) {
      console.error("Error creating producer:", error);
      throw error;
    }
  }

  async createConsumer(
    transport: any,
    producer: any,
    rtpCapabilities: any
  ): Promise<any | null> {
    if (!this.router) {
      throw new Error("Router not initialized");
    }

    try {
      if (
        !this.router.canConsume({ producerId: producer.id, rtpCapabilities })
      ) {
        console.error("Cannot consume producer");
        return null;
      }

      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: true,
        appData: {},
      });

      consumer.on("transportclose", () => {
        console.log("Consumer transport closed");
        consumer.close();
      });

      consumer.on("producerclose", () => {
        console.log("Consumer producer closed");
        consumer.close();
      });

      return consumer;
    } catch (error) {
      console.error("Error creating consumer:", error);
      throw error;
    }
  }

  getRouterRtpCapabilities(): any {
    if (!this.router) {
      throw new Error("Router not initialized");
    }
    return this.router.rtpCapabilities;
  }

  getRouter(): any | null {
    return this.router;
  }

  async close(): Promise<void> {
    if (this.worker) {
      this.worker.close();
    }
  }
}
