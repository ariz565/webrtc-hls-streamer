import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

export interface HLSConfig {
  segmentDuration: number;
  playlistSize: number;
  outputPath: string;
  resolution: string;
  bitrate: string;
}

export class HLSTranscoder {
  private static instance: HLSTranscoder;
  private activeTranscoders: Map<string, any> = new Map();
  private config: HLSConfig;

  private constructor() {
    this.config = {
      segmentDuration: parseInt(process.env.HLS_SEGMENT_DURATION || "4"),
      playlistSize: parseInt(process.env.HLS_PLAYLIST_SIZE || "5"),
      outputPath: process.env.HLS_PATH || "./public/hls",
      resolution: "1280x720",
      bitrate: "1000k",
    };

    // Ensure HLS output directory exists
    if (!fs.existsSync(this.config.outputPath)) {
      fs.mkdirSync(this.config.outputPath, { recursive: true });
    }
  }

  static getInstance(): HLSTranscoder {
    if (!HLSTranscoder.instance) {
      HLSTranscoder.instance = new HLSTranscoder();
    }
    return HLSTranscoder.instance;
  }

  async startTranscoding(
    streamId: string,
    inputRtpPort: number
  ): Promise<void> {
    const outputDir = path.join(this.config.outputPath, streamId);

    // Create output directory for this stream
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const playlistPath = path.join(outputDir, "playlist.m3u8");
    const segmentPattern = path.join(outputDir, "segment_%03d.ts");

    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(`rtp://127.0.0.1:${inputRtpPort}`)
        .inputOptions([
          "-protocol_whitelist",
          "file,udp,rtp",
          "-fflags",
          "+genpts",
        ])
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(this.config.resolution)
        .videoBitrate(this.config.bitrate)
        .audioBitrate("128k")
        .outputOptions([
          "-f",
          "hls",
          `-hls_time ${this.config.segmentDuration}`,
          `-hls_list_size ${this.config.playlistSize}`,
          "-hls_flags",
          "delete_segments+append_list",
          "-hls_segment_filename",
          segmentPattern,
        ])
        .output(playlistPath)
        .on("start", (commandLine) => {
          console.log(`Starting HLS transcoding for stream ${streamId}`);
          console.log("FFmpeg command:", commandLine);
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          console.error(`FFmpeg error for stream ${streamId}:`, err.message);
          console.error("FFmpeg stderr:", stderr);
          reject(err);
        })
        .on("end", () => {
          console.log(`HLS transcoding finished for stream ${streamId}`);
          this.activeTranscoders.delete(streamId);
        });

      this.activeTranscoders.set(streamId, command);
      command.run();
    });
  }

  async startTranscodingFromMediasoup(
    streamId: string,
    rtpParameters: any
  ): Promise<void> {
    const outputDir = path.join(this.config.outputPath, streamId);

    // Create output directory for this stream
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const playlistPath = path.join(outputDir, "playlist.m3u8");
    const segmentPattern = path.join(outputDir, "segment_%03d.ts");

    // Create SDP file for mediasoup RTP stream
    const sdpContent = this.generateSDP(rtpParameters);
    const sdpPath = path.join(outputDir, "input.sdp");
    fs.writeFileSync(sdpPath, sdpContent);

    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(sdpPath)
        .inputOptions(["-protocol_whitelist", "file,udp,rtp", "-re"])
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(this.config.resolution)
        .videoBitrate(this.config.bitrate)
        .audioBitrate("128k")
        .outputOptions([
          "-f",
          "hls",
          `-hls_time ${this.config.segmentDuration}`,
          `-hls_list_size ${this.config.playlistSize}`,
          "-hls_flags",
          "delete_segments+append_list",
          "-hls_segment_filename",
          segmentPattern,
          "-preset",
          "ultrafast",
          "-tune",
          "zerolatency",
        ])
        .output(playlistPath)
        .on("start", (commandLine) => {
          console.log(`Starting HLS transcoding for stream ${streamId}`);
          console.log("FFmpeg command:", commandLine);
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          console.error(`FFmpeg error for stream ${streamId}:`, err.message);
          if (stderr) console.error("FFmpeg stderr:", stderr);
          reject(err);
        })
        .on("end", () => {
          console.log(`HLS transcoding finished for stream ${streamId}`);
          this.activeTranscoders.delete(streamId);
        });

      this.activeTranscoders.set(streamId, command);
      command.run();
    });
  }

  private generateSDP(rtpParameters: any): string {
    // Basic SDP generation - would need more sophisticated implementation
    // for production use with proper codec parameters from mediasoup
    return `v=0
o=- 0 0 IN IP4 127.0.0.1
s=mediasoup
c=IN IP4 127.0.0.1
t=0 0
m=video 5004 RTP/AVP 96
a=rtpmap:96 H264/90000
a=recvonly
m=audio 5006 RTP/AVP 97
a=rtpmap:97 opus/48000/2
a=recvonly
`;
  }

  stopTranscoding(streamId: string): void {
    const command = this.activeTranscoders.get(streamId);
    if (command) {
      command.kill("SIGINT");
      this.activeTranscoders.delete(streamId);
      console.log(`Stopped HLS transcoding for stream ${streamId}`);
    }
  }

  isTranscoding(streamId: string): boolean {
    return this.activeTranscoders.has(streamId);
  }

  getPlaylistPath(streamId: string): string {
    return path.join(this.config.outputPath, streamId, "playlist.m3u8");
  }

  cleanupStream(streamId: string): void {
    this.stopTranscoding(streamId);

    const outputDir = path.join(this.config.outputPath, streamId);
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
      console.log(`Cleaned up HLS files for stream ${streamId}`);
    }
  }

  getActiveStreams(): string[] {
    return Array.from(this.activeTranscoders.keys());
  }
}
