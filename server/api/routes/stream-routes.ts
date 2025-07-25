import { Router, Request, Response } from "express";

export class StreamController {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes(): void {
    this.router.get("/status", this.getStreamStatus.bind(this));
    this.router.post("/start", this.startStream.bind(this));
    this.router.post("/stop", this.stopStream.bind(this));
    this.router.get("/participants", this.getParticipants.bind(this));
    this.router.get("/rooms", this.getRooms.bind(this));
  }

  private async getStreamStatus(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        status: "active",
        rooms: 3,
        participants: 12,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get stream status" });
    }
  }

  private async startStream(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.body;

      res.json({
        success: true,
        roomId,
        message: "Stream started successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to start stream" });
    }
  }

  private async stopStream(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.body;

      res.json({
        success: true,
        roomId,
        message: "Stream stopped successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to stop stream" });
    }
  }

  private async getParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.query;

      res.json({
        roomId,
        participants: [
          {
            id: "1",
            name: "Participant 1",
            connected: true,
            joinedAt: new Date().toISOString(),
          },
          {
            id: "2",
            name: "Participant 2",
            connected: true,
            joinedAt: new Date().toISOString(),
          },
        ],
        count: 2,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get participants" });
    }
  }

  private async getRooms(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        rooms: [
          {
            id: "default-room",
            name: "Default Room",
            participants: 2,
            active: true,
          },
          {
            id: "meeting-1",
            name: "Meeting Room 1",
            participants: 0,
            active: false,
          },
        ],
        count: 2,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch rooms",
      });
    }
  }
}
