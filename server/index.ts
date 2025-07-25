import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import express from "express";
import cors from "cors";
import { MediasoupWorker } from "./mediasoup/worker";
import { Room } from "./mediasoup/room";
import { HLSTranscoder } from "./hls/transcoder";
import { StreamController } from "./api/routes/stream-routes";
import { WatchController } from "./api/routes/watch-routes";

const app = express();
const server = createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve HLS files
app.use("/hls", express.static("./public/hls"));

// API Routes
const streamController = new StreamController();
const watchController = new WatchController();

app.use("/api/stream", streamController.getRouter());
app.use("/api/watch", watchController.getRouter());

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Initialize services
const mediasoupWorker = MediasoupWorker.getInstance();
const hlsTranscoder = HLSTranscoder.getInstance();
const rooms = new Map<string, Room>();

// Basic health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "fermion-streaming-server",
    rooms: rooms.size,
    activeStreams: hlsTranscoder.getActiveStreams(),
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  let currentRoom: Room | null = null;

  socket.on("joinRoom", async (data, callback) => {
    try {
      const { roomId } = data;

      // Get or create room
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Room(roomId));
      }

      currentRoom = rooms.get(roomId)!;
      await currentRoom.addParticipant(socket.id);

      socket.join(roomId);

      // Notify other participants about new user
      socket.to(roomId).emit("participantJoined", {
        id: socket.id,
        joinedAt: new Date().toISOString()
      });

      // Send router RTP capabilities
      callback({
        rtpCapabilities: currentRoom.getRouterRtpCapabilities(),
      });

      console.log(`Participant ${socket.id} joined room ${roomId}`);
    } catch (error: any) {
      console.error("Error joining room:", error);
      callback({ error: error.message });
    }
  });

  socket.on("createProducerTransport", async (callback) => {
    try {
      if (!currentRoom) {
        throw new Error("Not in a room");
      }

      const transportInfo = await currentRoom.createTransport(socket.id);
      callback(transportInfo);
    } catch (error: any) {
      console.error("Error creating producer transport:", error);
      callback({ error: error.message });
    }
  });

  socket.on("createConsumerTransport", async (callback) => {
    try {
      if (!currentRoom) {
        throw new Error("Not in a room");
      }

      const transportInfo = await currentRoom.createTransport(socket.id);
      callback(transportInfo);
    } catch (error: any) {
      console.error("Error creating consumer transport:", error);
      callback({ error: error.message });
    }
  });

  socket.on("connectTransport", async (data, callback) => {
    try {
      if (!currentRoom) {
        throw new Error("Not in a room");
      }

      const { transportId, dtlsParameters } = data;
      await currentRoom.connectTransport(
        socket.id,
        transportId,
        dtlsParameters
      );
      callback({ success: true });
    } catch (error: any) {
      console.error("Error connecting transport:", error);
      callback({ error: error.message });
    }
  });

  socket.on("produce", async (data, callback) => {
    try {
      if (!currentRoom) {
        throw new Error("Not in a room");
      }

      const { transportId, kind, rtpParameters } = data;
      const producerId = await currentRoom.createProducer(
        socket.id,
        transportId,
        rtpParameters,
        kind
      );

      // Start HLS transcoding for video producers
      if (kind === "video") {
        try {
          // Temporarily disable HLS transcoding to focus on WebRTC
          // TODO: Implement proper MediaSoup to HLS transcoding pipeline
          console.log("HLS transcoding temporarily disabled for debugging");
          // await hlsTranscoder.startTranscodingFromMediasoup(
          //   socket.id,
          //   rtpParameters
          // );
        } catch (hlsError) {
          console.error("HLS transcoding error:", hlsError);
          // Continue without HLS - WebRTC still works
        }
      }

      // Notify other participants
      socket.to(currentRoom.id).emit("newProducer", { 
        producerId, 
        kind,
        participantId: socket.id,
        timestamp: new Date().toISOString()
      });

      callback({ producerId });
    } catch (error: any) {
      console.error("Error producing:", error);
      callback({ error: error.message });
    }
  });

  socket.on("consume", async (data, callback) => {
    try {
      if (!currentRoom) {
        throw new Error("Not in a room");
      }

      const { producerId, rtpCapabilities, transportId } = data;
      const consumerInfo = await currentRoom.createConsumer(
        socket.id,
        transportId,
        producerId,
        rtpCapabilities
      );

      callback(consumerInfo);
    } catch (error: any) {
      console.error("Error consuming:", error);
      callback({ error: error.message });
    }
  });

  socket.on("resumeConsumer", async (data, callback) => {
    try {
      if (!currentRoom) {
        throw new Error("Not in a room");
      }

      const { consumerId } = data;
      await currentRoom.resumeConsumer(socket.id, consumerId);
      if (callback && typeof callback === "function") {
        callback({ success: true });
      }
    } catch (error: any) {
      console.error("Error resuming consumer:", error);
      if (callback && typeof callback === "function") {
        callback({ error: error.message });
      }
    }
  });

  socket.on("leaveRoom", () => {
    if (currentRoom) {
      // Notify other participants about user leaving
      socket.to(currentRoom.id).emit("participantLeft", {
        id: socket.id,
        leftAt: new Date().toISOString()
      });

      currentRoom.removeParticipant(socket.id);
      socket.leave(currentRoom.id);

      // Stop HLS transcoding
      hlsTranscoder.stopTranscoding(socket.id);

      // Clean up empty rooms
      if (currentRoom.isEmpty()) {
        rooms.delete(currentRoom.id);
      }

      currentRoom = null;
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    if (currentRoom) {
      // Notify other participants about user leaving
      socket.to(currentRoom.id).emit("participantLeft", {
        id: socket.id,
        leftAt: new Date().toISOString()
      });

      currentRoom.removeParticipant(socket.id);
      socket.leave(currentRoom.id);

      // Stop HLS transcoding
      hlsTranscoder.stopTranscoding(socket.id);

      // Clean up empty rooms
      if (currentRoom.isEmpty()) {
        rooms.delete(currentRoom.id);
      }
    }
  });
});

// Initialize mediasoup worker
async function init() {
  try {
    await mediasoupWorker.initialize();

    const PORT = process.env.SIGNALING_PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Fermion streaming server running on port ${PORT}`);
      console.log(`📺 HLS endpoint: http://localhost:${PORT}/hls/`);
    });
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

init();
