export class MediaDeviceManager {
  private static instance: MediaDeviceManager;
  private localStream: MediaStream | null = null;
  private devices: MediaDeviceInfo[] = [];

  private constructor() {}

  static getInstance(): MediaDeviceManager {
    if (!MediaDeviceManager.instance) {
      MediaDeviceManager.instance = new MediaDeviceManager();
    }
    return MediaDeviceManager.instance;
  }

  async getDevices(): Promise<MediaDeviceInfo[]> {
    try {
      this.devices = await navigator.mediaDevices.enumerateDevices();
      return this.devices.filter(device => 
        device.kind === 'videoinput' || device.kind === 'audioinput'
      );
    } catch (error) {
      console.error('Error getting media devices:', error);
      throw error;
    }
  }

  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  toggleTrack(kind: 'audio' | 'video', enabled: boolean): void {
    if (this.localStream) {
      const tracks = kind === 'audio' 
        ? this.localStream.getAudioTracks() 
        : this.localStream.getVideoTracks();
      
      tracks.forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  stopTrack(kind: 'audio' | 'video'): void {
    if (this.localStream) {
      const tracks = kind === 'audio' 
        ? this.localStream.getAudioTracks() 
        : this.localStream.getVideoTracks();
      
      tracks.forEach(track => {
        track.stop();
        this.localStream?.removeTrack(track);
      });
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}
