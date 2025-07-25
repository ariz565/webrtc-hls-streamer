import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import express from "express";
import cors from "cors";

const app = express();
const server = createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Basic health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "fermion-signaling-server" });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-disconnected", socket.id);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  socket.on("signal", (data) => {
    socket.to(data.to).emit("signal", {
      signal: data.signal,
      from: socket.id,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.SIGNALING_PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
