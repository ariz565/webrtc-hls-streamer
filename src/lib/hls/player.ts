import Hls from "hls.js";

export interface HLSPlayerConfig {
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  lowLatency?: boolean;
}

export class HLSPlayer {
  private hls: Hls | null = null;
  private video: HTMLVideoElement;
  private config: HLSPlayerConfig;

  constructor(videoElement: HTMLVideoElement, config: HLSPlayerConfig = {}) {
    this.video = videoElement;
    this.config = {
      autoplay: true,
      muted: false,
      controls: true,
      lowLatency: true,
      ...config,
    };
  }

  async loadSource(source: string): Promise<void> {
    if (!Hls.isSupported()) {
      // Check if the browser supports HLS natively
      if (this.video.canPlayType("application/vnd.apple.mpegurl")) {
        this.video.src = source;
        console.log("Using native HLS support");
        return;
      } else {
        throw new Error("HLS is not supported in this browser");
      }
    }

    // Clean up existing instance
    if (this.hls) {
      this.hls.destroy();
    }

    // Configure HLS.js for low latency
    const hlsConfig: any = {
      debug: false,
      enableWorker: true,
      lowLatencyMode: this.config.lowLatency,
      backBufferLength: 90,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 5,
      liveDurationInfinity: true,
      highBufferWatchdogPeriod: 2,
    };

    this.hls = new Hls(hlsConfig);

    this.setupEventListeners();

    this.hls.loadSource(source);
    this.hls.attachMedia(this.video);

    // Apply video configuration
    this.video.autoplay = this.config.autoplay || false;
    this.video.muted = this.config.muted || false;
    this.video.controls = this.config.controls || true;
  }

  private setupEventListeners(): void {
    if (!this.hls) return;

    this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      console.log("HLS: Media attached");
    });

    this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      console.log(
        `HLS: Manifest parsed, found ${data.levels.length} quality levels`
      );

      if (this.config.autoplay) {
        this.video.play().catch((err) => {
          console.error("Autoplay failed:", err);
        });
      }
    });

    this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      console.log(`HLS: Level switched to ${data.level}`);
    });

    this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      console.log(`HLS: Fragment loaded: ${data.frag.url}`);
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
      console.error("HLS Error:", data);

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log("Fatal network error, trying to recover...");
            this.hls?.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log("Fatal media error, trying to recover...");
            this.hls?.recoverMediaError();
            break;
          default:
            console.log("Fatal error, cannot recover");
            this.destroy();
            break;
        }
      }
    });

    // Video element events
    this.video.addEventListener("waiting", () => {
      console.log("Video is waiting for data...");
    });

    this.video.addEventListener("playing", () => {
      console.log("Video started playing");
    });

    this.video.addEventListener("error", (e) => {
      console.error("Video error:", e);
    });
  }

  play(): Promise<void> {
    return this.video.play();
  }

  pause(): void {
    this.video.pause();
  }

  stop(): void {
    this.video.pause();
    this.video.currentTime = 0;
  }

  seekToLive(): void {
    if (this.hls && this.hls.liveSyncPosition) {
      this.video.currentTime = this.hls.liveSyncPosition;
    }
  }

  setVolume(volume: number): void {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  mute(): void {
    this.video.muted = true;
  }

  unmute(): void {
    this.video.muted = false;
  }

  getQualityLevels(): any[] {
    return this.hls?.levels || [];
  }

  setQualityLevel(level: number): void {
    if (this.hls) {
      this.hls.currentLevel = level;
    }
  }

  enableAutoQuality(): void {
    if (this.hls) {
      this.hls.currentLevel = -1; // Auto quality
    }
  }

  getStats(): any {
    if (!this.hls) return null;

    return {
      currentLevel: this.hls.currentLevel,
      loadLevel: this.hls.loadLevel,
      buffered: this.video.buffered,
      currentTime: this.video.currentTime,
      duration: this.video.duration,
      latency: this.hls.latency,
      drift: this.hls.drift,
    };
  }

  isLive(): boolean {
    return this.video.duration === Infinity;
  }

  destroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
}
