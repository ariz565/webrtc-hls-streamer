import { MediasoupWorker } from './worker';

export interface Participant {
  id: string;
  socketId: string;
  displayName: string;
  producers: Map<string, any>;
  consumers: Map<string, any>;
  transports: Map<string, any>;
}

export class Room {
  public id: string;
  private participants: Map<string, Participant> = new Map();
  private mediasoupWorker: MediasoupWorker;

  constructor(roomId: string) {
    this.id = roomId;
    this.mediasoupWorker = MediasoupWorker.getInstance();
  }

  async addParticipant(socketId: string, displayName: string = 'Anonymous'): Promise<Participant> {
    const participant: Participant = {
      id: socketId,
      socketId,
      displayName,
      producers: new Map(),
      consumers: new Map(),
      transports: new Map(),
    };

    this.participants.set(socketId, participant);
    console.log(`Participant ${socketId} joined room ${this.id}`);
    
    return participant;
  }

  removeParticipant(socketId: string): void {
    const participant = this.participants.get(socketId);
    if (participant) {
      // Close all producers
      participant.producers.forEach(producer => producer.close());
      
      // Close all consumers
      participant.consumers.forEach(consumer => consumer.close());
      
      // Close all transports
      participant.transports.forEach(transport => transport.close());
      
      this.participants.delete(socketId);
      console.log(`Participant ${socketId} left room ${this.id}`);
    }
  }

  getParticipant(socketId: string): Participant | undefined {
    return this.participants.get(socketId);
  }

  getAllParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  getOtherParticipants(excludeSocketId: string): Participant[] {
    return Array.from(this.participants.values()).filter(p => p.socketId !== excludeSocketId);
  }

  async createTransport(socketId: string): Promise<any> {
    const participant = this.participants.get(socketId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    const transport = await this.mediasoupWorker.createWebRtcTransport();
    participant.transports.set(transport.id, transport);
    
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(socketId: string, transportId: string, dtlsParameters: any): Promise<void> {
    const participant = this.participants.get(socketId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    const transport = participant.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }

    await this.mediasoupWorker.connectTransport(transport, dtlsParameters);
  }

  async createProducer(
    socketId: string, 
    transportId: string, 
    rtpParameters: any, 
    kind: 'audio' | 'video'
  ): Promise<string> {
    const participant = this.participants.get(socketId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    const transport = participant.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }

    const producer = await this.mediasoupWorker.createProducer(transport, rtpParameters, kind);
    participant.producers.set(producer.id, producer);

    // Notify other participants about new producer
    this.notifyNewProducer(socketId, producer.id, kind);

    return producer.id;
  }

  async createConsumer(
    socketId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: any
  ): Promise<any> {
    const participant = this.participants.get(socketId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    const transport = participant.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }

    // Find the producer
    let producer: any = null;
    for (const otherParticipant of this.participants.values()) {
      if (otherParticipant.producers.has(producerId)) {
        producer = otherParticipant.producers.get(producerId);
        break;
      }
    }

    if (!producer) {
      throw new Error('Producer not found');
    }

    const consumer = await this.mediasoupWorker.createConsumer(transport, producer, rtpCapabilities);
    if (!consumer) {
      throw new Error('Cannot create consumer');
    }

    participant.consumers.set(consumer.id, consumer);

    return {
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  async resumeConsumer(socketId: string, consumerId: string): Promise<void> {
    const participant = this.participants.get(socketId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    const consumer = participant.consumers.get(consumerId);
    if (!consumer) {
      throw new Error('Consumer not found');
    }

    await consumer.resume();
  }

  private notifyNewProducer(producerSocketId: string, producerId: string, kind: string): void {
    // This would typically emit to other participants via socket.io
    // Implementation depends on how you handle socket connections
    console.log(`New producer ${producerId} (${kind}) from ${producerSocketId}`);
  }

  getParticipantCount(): number {
    return this.participants.size;
  }

  isEmpty(): boolean {
    return this.participants.size === 0;
  }

  getRouterRtpCapabilities(): any {
    return this.mediasoupWorker.getRouterRtpCapabilities();
  }
}
