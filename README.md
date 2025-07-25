# Fermion WebRTC-HLS Streaming Platform

A real-time streaming platform built with WebRTC and HLS, demonstrating the technical capabilities for Fermion's vision of providing robust streaming infrastructure for ed-tech platforms.

## Architecture Overview

This application implements a sophisticated streaming pipeline:

1. **WebRTC Layer** (/stream): Real-time peer-to-peer connections for low-latency streaming
2. **HLS Layer** (/watch): HTTP Live Streaming for scalable video distribution
3. **Signaling Server**: WebSocket-based coordination for WebRTC connections
4. **Media Processing**: (Future) FFMPEG-based transcoding from WebRTC to HLS

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express and Socket.IO
- **WebRTC**: Mediasoup (SFU architecture)
- **Streaming**: HLS.js for client-side playback
- **Media Processing**: FFMPEG for transcoding

## Project Structure

```
fermion-webrtc-hls/
├── src/app/                 # Next.js App Router pages
│   ├── stream/             # WebRTC streaming interface
│   └── watch/              # HLS viewer interface
├── server/                 # Node.js backend
│   ├── mediasoup/          # WebRTC SFU logic
│   ├── hls/                # HLS transcoding
│   └── api/                # REST endpoints
└── public/hls/             # HLS output files
```

## Getting Started

### Prerequisites

- Node.js 18+
- FFMPEG (for media processing)
- Modern browser with WebRTC support

### Installation

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
# Or separately:
npm run dev:next    # Frontend (port 3000)
npm run dev:server  # Backend (port 3001)
```

### Access Points

- **Homepage**: http://localhost:3000
- **Stream**: http://localhost:3000/stream
- **Watch**: http://localhost:3000/watch
- **Signaling API**: http://localhost:3001

## Features Implemented

✅ Project structure and configuration  
✅ Next.js frontend with TypeScript  
✅ Socket.IO signaling server  
✅ Basic UI for streaming and watching  
⏳ WebRTC media capture and transmission  
⏳ Mediasoup SFU implementation  
⏳ FFMPEG HLS transcoding pipeline  
⏳ HLS.js player integration

## Development Notes

This implementation demonstrates:

- **Clean Architecture**: Separation of concerns between client and server
- **Scalable Design**: SFU pattern for efficient media routing
- **Production Readiness**: TypeScript, proper error handling, configuration management
- **Real-world Complexity**: Addressing the technical challenges of live streaming

The goal is to showcase not just the ability to build features, but to architect systems that can scale and handle the complexities of real-time media applications.

## Environment Variables

```env
MEDIASOUP_LISTEN_IP=127.0.0.1
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=49999
HLS_PATH=./public/hls
SIGNALING_PORT=3001
HLS_SERVER_PORT=3002
```
