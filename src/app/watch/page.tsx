"use client";

import { useState, useEffect, useRef } from "react";

export default function WatchPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // HLS player initialization will go here
    console.log("Watch page loaded");
    setIsLoading(false);
  }, []);

  const startWatching = () => {
    setIsLive(true);
    // HLS stream loading logic will go here
  };

  const stopWatching = () => {
    setIsLive(false);
    // HLS stream stopping logic will go here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Clean Header */}
      <div className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Fermion Watch</h1>
              <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                <span
                  className={`flex items-center gap-2 ${
                    isLive ? "text-green-400" : "text-slate-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isLive ? "bg-green-400 animate-pulse" : "bg-slate-500"
                    }`}
                  ></div>
                  {isLive ? "Live" : "Offline"}
                </span>
                <span>•</span>
                <span>{viewerCount} viewers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Main Video Container */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-2xl">
          {/* Video Area */}
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden mb-6">
            <video
              ref={videoRef}
              controls
              playsInline
              className="w-full h-full object-cover"
            />

            {!isLive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📺</span>
                  </div>
                  <p className="text-slate-400 text-lg">Stream is offline</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Check back later for live content
                  </p>
                </div>
              </div>
            )}

            {/* Live Indicator */}
            {isLive && (
              <div className="absolute top-4 left-4">
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
              </div>
            )}

            {/* Viewer Count */}
            {isLive && (
              <div className="absolute top-4 right-4">
                <div className="bg-slate-900/80 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {viewerCount} watching
                </div>
              </div>
            )}
          </div>

          {/* Clean Control Panel */}
          <div className="flex items-center justify-center gap-4">
            {!isLive ? (
              <button
                onClick={startWatching}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl min-w-[140px] justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <span className="text-lg">▶</span>
                    Watch Stream
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={stopWatching}
                className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl"
              >
                <span>■</span>
                Stop Watching
              </button>
            )}
          </div>

          {/* Connection Info */}
          {!isLive && !isLoading && (
            <div className="text-center mt-6">
              <p className="text-slate-400 text-sm">
                Click &quot;Watch Stream&quot; to connect to the live HLS stream
              </p>
            </div>
          )}
        </div>

        {/* Stream Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-6 bg-slate-800/30 rounded-lg px-6 py-3 text-sm text-slate-400">
            <span>HLS Stream • Adaptive Bitrate</span>
            <span>•</span>
            <span>Ultra Low Latency</span>
          </div>
        </div>
      </div>
    </div>
  );
}
