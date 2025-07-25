"use client";

interface StreamControlsProps {
  isConnected: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLoading: boolean;
  onJoinRoom: () => void;
  onLeaveRoom: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

export default function StreamControls({
  isConnected,
  audioEnabled,
  videoEnabled,
  isLoading,
  onJoinRoom,
  onLeaveRoom,
  onToggleAudio,
  onToggleVideo,
}: StreamControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Main Action Button */}
      {!isConnected ? (
        <button
          onClick={onJoinRoom}
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl min-w-[140px] justify-center"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Joining...
            </>
          ) : (
            <>
              <span className="text-lg">🚪</span>
              Join Room
            </>
          )}
        </button>
      ) : (
        <button
          onClick={onLeaveRoom}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl"
        >
          <span>🚪</span>
          Leave Room
        </button>
      )}

      {/* Media Controls - Show when connected */}
      {isConnected && (
        <>
          <button
            onClick={onToggleAudio}
            className={`p-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
              audioEnabled
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-600 hover:bg-slate-500 text-white border-2 border-slate-400"
            }`}
            title={audioEnabled ? "Mute microphone" : "Enable microphone"}
          >
            <span className="text-lg">{audioEnabled ? "🎤" : "🔇"}</span>
          </button>

          <button
            onClick={onToggleVideo}
            className={`p-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
              videoEnabled
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-600 hover:bg-slate-500 text-white border-2 border-slate-400"
            }`}
            title={videoEnabled ? "Turn off camera" : "Enable camera"}
          >
            <span className="text-lg">{videoEnabled ? "📹" : "📷"}</span>
          </button>
        </>
      )}
    </div>
  );
}
