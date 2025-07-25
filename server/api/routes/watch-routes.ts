import { Router, Request, Response } from "express";

export class WatchController {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes(): void {
    this.router.get("/streams", this.getAvailableStreams.bind(this));
    this.router.get("/room/:roomId", this.getRoomStream.bind(this));
    this.router.get("/stats/:streamId", this.getStreamStats.bind(this));
    this.router.get("/playlist/:roomId", this.getHLSPlaylist.bind(this));
  }

  private async getAvailableStreams(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      res.json({
        success: true,
        streams: [
          {
            id: "stream-1",
            roomId: "default-room",
            title: "Live Conference",
            viewers: 45,
            status: "live",
            startedAt: new Date().toISOString(),
            hlsUrl: "/hls/default-room/playlist.m3u8",
          },
          {
            id: "stream-2",
            roomId: "meeting-1",
            title: "Team Meeting",
            viewers: 12,
            status: "live",
            startedAt: new Date().toISOString(),
            hlsUrl: "/hls/meeting-1/playlist.m3u8",
          },
        ],
        count: 2,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch available streams",
      });
    }
  }

  private async getRoomStream(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      res.json({
        success: true,
        stream: {
          roomId,
          title: `Stream for ${roomId}`,
          viewers: Math.floor(Math.random() * 100),
          status: "live",
          hlsUrl: `/hls/${roomId}/playlist.m3u8`,
          webrtcUrl: `ws://localhost:3001?room=${roomId}`,
          startedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch room stream",
      });
    }
  }

  private async getStreamStats(req: Request, res: Response): Promise<void> {
    try {
      const { streamId } = req.params;

      res.json({
        success: true,
        stats: {
          streamId,
          viewers: Math.floor(Math.random() * 100),
          bitrate: "2500 kbps",
          resolution: "1920x1080",
          fps: 30,
          uptime: Math.floor(Math.random() * 3600),
          bandwidth: {
            incoming: "3.2 Mbps",
            outgoing: "15.6 Mbps",
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch stream statistics",
      });
    }
  }

  private async getHLSPlaylist(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      // Generate a sample M3U8 playlist
      const playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
segment-0.ts
#EXTINF:10.0,
segment-1.ts
#EXTINF:10.0,
segment-2.ts
#EXT-X-ENDLIST`;

      res.set("Content-Type", "application/vnd.apple.mpegurl");
      res.send(playlist);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to generate HLS playlist",
      });
    }
  }
}
