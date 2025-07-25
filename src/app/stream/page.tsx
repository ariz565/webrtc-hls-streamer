"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MediaDeviceManager } from "@/lib/webrtc/media-devices";
import { MediasoupClient } from "@/lib/webrtc/mediasoup-client";

interface Participant {
  id: string;
  track?: MediaStreamTrack;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  joinedAt?: Date;
}

export default function StreamPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [devicePermissions, setDevicePermissions] = useState({
    camera: false,
    microphone: false,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaDeviceManager = useRef(MediaDeviceManager.getInstance());
  const mediasoupClient = useRef(MediasoupClient.getInstance());

  const handleNewRemoteStream = useCallback((event: any) => {
    const { track, consumerId } = event.detail;
    console.log("New remote stream received:", { track, consumerId });

    setParticipants((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === consumerId);
      if (existingIndex >= 0) {
        // Update existing participant
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          track,
          isVideoEnabled: track?.kind === "video",
          isAudioEnabled: track?.kind === "audio",
        };
        return updated;
      } else {
        // Add new participant
        return [
          ...prev,
          {
            id: consumerId,
            track,
            isVideoEnabled: track?.kind === "video",
            isAudioEnabled: track?.kind === "audio",
            joinedAt: new Date(),
          },
        ];
      }
    });
  }, []);

  const handleParticipantJoined = useCallback((event: any) => {
    const participantData = event.detail;
    console.log("Participant joined:", participantData);

    setParticipants((prev) => {
      const exists = prev.find((p) => p.id === participantData.id);
      if (!exists) {
        return [
          ...prev,
          {
            id: participantData.id,
            joinedAt: new Date(),
            isAudioEnabled: false,
            isVideoEnabled: false,
          },
        ];
      }
      return prev;
    });
  }, []);

  const handleParticipantLeft = useCallback((event: any) => {
    const participantData = event.detail;
    console.log("Participant left:", participantData);

    setParticipants((prev) => prev.filter((p) => p.id !== participantData.id));
  }, []);

  useEffect(() => {
    console.log("Stream page loaded");

    // Set up event listeners
    window.addEventListener("newRemoteStream", handleNewRemoteStream);
    window.addEventListener("participantJoined", handleParticipantJoined);
    window.addEventListener("participantLeft", handleParticipantLeft);

    const currentMediaManager = mediaDeviceManager.current;

    return () => {
      window.removeEventListener("newRemoteStream", handleNewRemoteStream);
      window.removeEventListener("participantJoined", handleParticipantJoined);
      window.removeEventListener("participantLeft", handleParticipantLeft);
      currentMediaManager.stopLocalStream();
    };
  }, [handleNewRemoteStream, handleParticipantJoined, handleParticipantLeft]);

  const toggleAudio = async () => {
    try {
      if (!isConnected) {
        setError("Please join a room first");
        return;
      }

      setIsLoading(true);

      if (!audioEnabled) {
        // First time enabling audio - get media access and start producing
        const stream = await mediaDeviceManager.current.getUserMedia({
          audio: true,
          video: false, // Only request audio
        });

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          await mediasoupClient.current.produce(audioTrack);
          setAudioEnabled(true);
          setDevicePermissions((prev) => ({ ...prev, microphone: true }));
        }
      } else {
        // Toggle existing audio
        mediaDeviceManager.current.toggleTrack("audio", false);
        setAudioEnabled(false);
      }
    } catch (err: any) {
      console.error("Error toggling audio:", err);
      setError("Failed to access microphone. Please check permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVideo = async () => {
    try {
      if (!isConnected) {
        setError("Please join a room first");
        return;
      }

      setIsLoading(true);

      if (!videoEnabled) {
        // First time enabling video - get media access and start producing
        const stream = await mediaDeviceManager.current.getUserMedia({
          video: true,
          audio: false, // Only request video
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          await mediasoupClient.current.produce(videoTrack);
          setVideoEnabled(true);
          setDevicePermissions((prev) => ({ ...prev, camera: true }));
        }
      } else {
        // Toggle existing video
        mediaDeviceManager.current.toggleTrack("video", false);
        setVideoEnabled(false);

        if (localVideoRef.current) {
          localVideoRef.current.style.opacity = "0.3";
        }
      }
    } catch (err: any) {
      console.error("Error toggling video:", err);
      setError("Failed to access camera. Please check permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const stopAllMedia = () => {
    mediaDeviceManager.current.stopLocalStream();
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setAudioEnabled(false);
    setVideoEnabled(false);
    setDevicePermissions({ camera: false, microphone: false });
  };

  const joinRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setConnectionStatus("connecting");

      // Join room without any media first - just like Google Meet
      await mediasoupClient.current.joinRoom("default-room");

      setIsConnected(true);
      setConnectionStatus("connected");

      console.log("Joined room successfully - no media started yet");
    } catch (err: any) {
      console.error("Error joining room:", err);
      setError(err.message || "Failed to join room");
      setConnectionStatus("disconnected");
    } finally {
      setIsLoading(false);
    }
  };

  const leaveRoom = () => {
    mediasoupClient.current.leaveRoom();
    stopAllMedia();
    setIsConnected(false);
    setParticipants([]);
    setError(null);
    setConnectionStatus("disconnected");
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-amber-600";
      default:
        return "text-red-600";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "🟢 Connected";
      case "connecting":
        return "🟡 Connecting...";
      default:
        return "🔴 Disconnected";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Modern Navbar */}
      <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Fermion Stream
                </h1>
                <p className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </p>
              </div>

              <div className="hidden md:flex items-center gap-6 text-sm">
                <a
                  href="/watch"
                  className="text-gray-600 hover:text-purple-600 transition-colors font-medium"
                >
                  Watch Streams
                </a>
                <span className="text-gray-400">Live Broadcasting</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
                <span className="text-red-500 text-lg">⚠</span>
                <span className="text-sm font-medium">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-500 hover:text-red-700 text-lg font-bold"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Video Area - Left Side (9 columns) */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-gray-200 shadow-2xl shadow-gray-200/50">
              {/* Compact Video Area */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden mb-8 max-h-[400px] shadow-2xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${
                    videoEnabled ? "block" : "hidden"
                  }`}
                />

                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <span className="text-3xl">📷</span>
                      </div>
                      <p className="text-gray-300 text-xl font-medium mb-2">
                        {isConnected ? "Camera is off" : "Not connected"}
                      </p>
                      {isConnected && (
                        <p className="text-slate-500 text-sm mt-2">
                          Click the camera button to turn on your video
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Indicator */}
                {isConnected && (
                  <div className="absolute top-6 left-6">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-500/30">
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </div>
                  </div>
                )}

                {/* You Label */}
                <div className="absolute bottom-6 left-6">
                  <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20">
                    You {audioEnabled && "🎤"} {videoEnabled && "📹"}
                  </div>
                </div>
              </div>

              {/* Control Panel */}
              <div className="flex items-center justify-center gap-4 mb-6">
                {/* Main Action Button */}
                {!isConnected ? (
                  <button
                    onClick={joinRoom}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl min-w-[140px] justify-center"
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
                    onClick={leaveRoom}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl"
                  >
                    <span>🚪</span>
                    Leave Room
                  </button>
                )}

                {/* Media Controls - Show when connected */}
                {isConnected && (
                  <>
                    <button
                      onClick={toggleAudio}
                      disabled={isLoading}
                      className={`p-4 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 ${
                        audioEnabled
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                          : "bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white border-2 border-gray-300"
                      }`}
                      title={
                        audioEnabled ? "Mute microphone" : "Enable microphone"
                      }
                    >
                      <span className="text-lg">
                        {isLoading ? "⏳" : audioEnabled ? "🎤" : "🔇"}
                      </span>
                    </button>

                    <button
                      onClick={toggleVideo}
                      disabled={isLoading}
                      className={`p-4 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 ${
                        videoEnabled
                          ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                          : "bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white border-2 border-gray-300"
                      }`}
                      title={videoEnabled ? "Turn off camera" : "Enable camera"}
                    >
                      <span className="text-lg">
                        {isLoading ? "⏳" : videoEnabled ? "📹" : "📷"}
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Connection Status */}
              {!isConnected && !isLoading && (
                <div className="text-center">
                  <p className="text-gray-600 text-sm font-medium">
                    Click &quot;Join Room&quot; to connect, then enable your
                    camera/microphone as needed
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    Just like Google Meet - join first, enable media later!
                  </p>
                </div>
              )}

              {/* Stream Info */}
              {isConnected && (
                <div className="text-center mt-4">
                  <div className="inline-flex items-center gap-6 bg-slate-800/30 rounded-lg px-6 py-3 text-sm text-slate-400">
                    <span>WebRTC • Low Latency</span>
                    <span>•</span>
                    <a
                      href="/watch"
                      target="_blank"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Watch HLS Stream
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participants Panel - Right Side (3 columns) */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 border border-gray-200 shadow-2xl shadow-gray-200/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  Participants
                </h3>
                <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                  {participants.length + (isConnected ? 1 : 0)}
                </span>
              </div>

              <div className="space-y-4">
                {/* Your own participant card */}
                {isConnected && (
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-sm font-bold text-white">
                          You
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-800">
                          You (Host)
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs font-medium ${
                              audioEnabled ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {audioEnabled ? "🎤 Audio" : "🔇 Muted"}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              videoEnabled ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {videoEnabled ? "📹 Video" : "📷 Off"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remote participants */}
                {participants.map((participant, index) => (
                  <RemoteParticipantCard
                    key={participant.id}
                    participant={participant}
                    index={index}
                  />
                ))}

                {/* Empty state */}
                {participants.length === 0 && isConnected && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-2xl">👥</span>
                    </div>
                    <p className="text-gray-600 text-sm font-medium">
                      Waiting for others to join...
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Share this room with friends!
                    </p>
                  </div>
                )}

                {!isConnected && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center opacity-50 shadow-lg">
                      <span className="text-2xl">👥</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Join the room to see participants
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Remote Participant Component
function RemoteParticipantCard({
  participant,
  index,
}: {
  participant: Participant;
  index: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.track) {
      const stream = new MediaStream([participant.track]);
      videoRef.current.srcObject = stream;
    }
  }, [participant.track]);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center relative shadow-lg">
          <span className="text-sm font-bold text-white">P{index + 1}</span>
          {participant.track?.kind === "video" && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-blue-800 truncate">
            Participant {index + 1}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs font-medium ${
                participant.isAudioEnabled ? "text-green-600" : "text-gray-500"
              }`}
            >
              {participant.isAudioEnabled ? "🎤" : "🔇"}
            </span>
            <span
              className={`text-xs font-medium ${
                participant.isVideoEnabled ? "text-green-600" : "text-gray-500"
              }`}
            >
              {participant.isVideoEnabled ? "📹" : "📷"}
            </span>
            <span className="text-xs text-slate-400">
              {participant.joinedAt
                ? new Date(participant.joinedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Now"}
            </span>
          </div>
        </div>
      </div>

      {/* Small video preview if available */}
      {participant.track?.kind === "video" && (
        <div className="mt-3 aspect-video bg-slate-900 rounded overflow-hidden max-h-20">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
