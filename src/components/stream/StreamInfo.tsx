"use client";

interface StreamInfoProps {
  isConnected: boolean;
  roomId?: string;
  streamUrl?: string;
}

export default function StreamInfo({
  isConnected,
  roomId = "default-room",
  streamUrl = "/watch",
}: StreamInfoProps) {
  if (!isConnected) {
    return (
      <div className="text-center mt-6">
        <p className="text-slate-400 text-sm">
          Click &quot;Join Room&quot; to connect, then enable your
          camera/microphone as needed
        </p>
        <p className="text-slate-500 text-xs mt-2">
          Just like Google Meet - join first, enable media later!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 text-center">
      <div className="inline-flex items-center gap-6 bg-slate-800/30 rounded-lg px-6 py-3 text-sm text-slate-400">
        <span>WebRTC • Low Latency</span>
        <span>•</span>
        <span>Room: {roomId}</span>
        <span>•</span>
        <a
          href={streamUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Watch HLS Stream
        </a>
      </div>
    </div>
  );
}
