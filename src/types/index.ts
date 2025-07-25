export interface MediasoupDevice {
  id: string;
  kind: "audioinput" | "videoinput" | "audiooutput";
  label: string;
}

export interface RoomState {
  id: string;
  participants: Participant[];
  isConnected: boolean;
}

export interface Participant {
  id: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  producer?: any;
  consumer?: any;
}

export interface SignalingMessage {
  type: "join" | "leave" | "offer" | "answer" | "candidate" | "media-state";
  data: any;
  participantId?: string;
  roomId?: string;
}

export interface HLSConfig {
  segmentDuration: number;
  playlistSize: number;
  outputPath: string;
}

export interface MediaState {
  audio: boolean;
  video: boolean;
}
