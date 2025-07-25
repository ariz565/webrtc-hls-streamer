"use client";

import { useState, useEffect, useCallback } from "react";
import HLSPlayer from "@/components/watch/HLSPlayer";

interface StreamInfo {
  id: string;
  url: string;
}

interface ActiveStreamResponse {
  success: boolean;
  streamUrl?: string;
  streamId?: string;
  isLive?: boolean;
  lastUpdated?: string;
  availableStreams?: StreamInfo[];
  message?: string;
}

export default function WatchPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hlsStreamUrl, setHlsStreamUrl] = useState<string | null>(null);
  const [streamInfo, setStreamInfo] = useState<ActiveStreamResponse | null>(
    null
  );
  const [autoRefresh, setAutoRefresh] = useState(true);

  const checkForActiveStreams = useCallback(async () => {
    try {
      const response = await fetch("/api/streams/active");
      const data: ActiveStreamResponse = await response.json();

      setStreamInfo(data);

      if (data.success && data.streamUrl && data.isLive) {
        setHlsStreamUrl(data.streamUrl);
        setIsLive(true);
        setError(null);
        console.log(`Found active stream: ${data.streamId}`);
      } else {
        setIsLive(false);
        setError(data.message || "No active streams found");

        // If we had a stream before but now it's gone, clear it
        if (hlsStreamUrl && !data.streamUrl) {
          setHlsStreamUrl(null);
        }
      }
    } catch (err) {
      setIsLive(false);
      setError("Failed to check for active streams");
      console.error("Error checking for streams:", err);
    } finally {
      setIsLoading(false);
    }
  }, [hlsStreamUrl]);

  useEffect(() => {
    console.log("Watch page loaded");

    // Initial check
    checkForActiveStreams();

    // Set up auto-refresh to check for new streams
    const interval = setInterval(() => {
      if (autoRefresh) {
        checkForActiveStreams();
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, checkForActiveStreams]);

  const handlePlayerError = (error: any) => {
    console.error("HLS Player error:", error);
    setError("Stream playback error - checking for new streams...");
    setIsLive(false);

    // Try to find a new stream after a brief delay
    setTimeout(() => {
      checkForActiveStreams();
    }, 2000);
  };

  const handlePlayerLoaded = () => {
    setIsLive(true);
    setError(null);
    // Simulate viewer count
    setViewerCount(Math.floor(Math.random() * 50) + 10);
  };

  const handleRefreshStreams = () => {
    setIsLoading(true);
    checkForActiveStreams();
  };

  const selectStream = (streamUrl: string) => {
    setHlsStreamUrl(streamUrl);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Modern Navbar */}
      <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Fermion Watch
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span
                    className={`flex items-center gap-2 font-medium ${
                      isLive ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isLive
                          ? "bg-green-500 animate-pulse shadow-lg shadow-green-500/50"
                          : "bg-gray-400"
                      }`}
                    ></div>
                    {isLive ? "Live" : "Offline"}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-700 font-medium">
                    {viewerCount} viewers
                  </span>
                  {streamInfo?.streamId && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-blue-600 font-medium">
                        Stream: {streamInfo.streamId.substring(0, 8)}...
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-6 text-sm">
                <a
                  href="/stream"
                  className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Start Streaming
                </a>
                <span className="text-gray-400">WebRTC to HLS</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefreshStreams}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? "Checking..." : "🔄 Refresh"}
              </button>

              <label className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Auto-refresh
              </label>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Main Video Container */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-gray-200 shadow-2xl shadow-gray-200/50">
          {/* Video Area */}
          <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden mb-8 shadow-2xl">
            {hlsStreamUrl && isLive && !error ? (
              <HLSPlayer
                src={hlsStreamUrl}
                autoPlay
                controls
                className="w-full h-full"
                onLoadedData={handlePlayerLoaded}
                onError={handlePlayerError}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <span className="text-3xl">📺</span>
                  </div>
                  <p className="text-gray-300 text-xl font-medium mb-2">
                    {isLoading
                      ? "Searching for streams..."
                      : error || "No active streams"}
                  </p>
                  <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                    {isLoading
                      ? "Please wait while we check for available streams..."
                      : error
                      ? "Unable to load stream content"
                      : "Start streaming on /stream to watch live content here"}
                  </p>
                  {error && !isLoading && (
                    <button
                      onClick={handleRefreshStreams}
                      className="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      🔍 Search Again
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Live Indicator */}
            {isLive && (
              <div className="absolute top-6 left-6">
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-500/30">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
              </div>
            )}

            {/* Stream Quality Indicator */}
            {isLive && (
              <div className="absolute top-6 right-6">
                <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20">
                  HLS Stream
                </div>
              </div>
            )}
          </div>

          {/* Stream Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">📡</span>
                </div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                  Status
                </h3>
              </div>
              <p
                className={`text-2xl font-bold ${
                  isLive ? "text-green-600" : "text-gray-500"
                }`}
              >
                {isLive ? "Live Now" : "Offline"}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">👥</span>
                </div>
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
                  Viewers
                </h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">{viewerCount}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🎥</span>
                </div>
                <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
                  Format
                </h3>
              </div>
              <p className="text-2xl font-bold text-purple-600">HLS</p>
            </div>
          </div>

          {/* Available Streams */}
          {streamInfo?.availableStreams &&
            streamInfo.availableStreams.length > 1 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  Available Streams
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {streamInfo.availableStreams.map((stream, index) => (
                    <button
                      key={stream.id}
                      onClick={() => selectStream(stream.url)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                        hlsStreamUrl === stream.url
                          ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-lg shadow-blue-200"
                          : "border-gray-200 bg-gradient-to-br from-gray-50 to-white text-gray-700 hover:border-gray-300 hover:shadow-lg"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            hlsStreamUrl === stream.url
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="font-bold text-lg">
                          Stream {index + 1}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 font-mono bg-gray-100 rounded-lg px-3 py-2">
                        ID: {stream.id.substring(0, 12)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Stream Actions */}
          <div className="text-center">
            <div className="inline-flex items-center gap-8 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl px-8 py-4 text-sm text-gray-600 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-medium">WebRTC to HLS</span>
              </div>
              <span className="text-gray-300">•</span>
              <span className="font-medium">Low Latency Streaming</span>
              <span className="text-gray-300">•</span>
              <a
                href="/stream"
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                Start Streaming →
              </a>
              <span className="text-gray-300">•</span>
              <span
                className={`font-medium ${
                  autoRefresh ? "text-green-600" : "text-gray-500"
                }`}
              >
                Auto-refresh: {autoRefresh ? "On" : "Off"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
