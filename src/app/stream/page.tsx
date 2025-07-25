"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MediaDeviceManager } from "@/lib/webrtc/media-devices";
import { MediasoupClient } from "@/lib/webrtc/mediasoup-client";

export default function StreamPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
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
    setParticipants((prev) => [...prev, { id: consumerId, track }]);
  }, []);

  useEffect(() => {
    console.log("Stream page loaded");
    window.addEventListener("newRemoteStream", handleNewRemoteStream);
    const currentMediaManager = mediaDeviceManager.current;

    return () => {
      window.removeEventListener("newRemoteStream", handleNewRemoteStream);
      currentMediaManager.stopLocalStream();
    };
  }, [handleNewRemoteStream]);

  const toggleAudio = async () => {
    try {
      if (isConnected) {
        const newAudioState = !audioEnabled;
        mediaDeviceManager.current.toggleTrack("audio", newAudioState);
        setAudioEnabled(newAudioState);
      } else {
        setError("Please join a room first");
      }
    } catch (err) {
      console.error("Error toggling audio:", err);
      setError("Failed to toggle audio");
    }
  };

  const toggleVideo = async () => {
    try {
      if (isConnected) {
        const newVideoState = !videoEnabled;
        mediaDeviceManager.current.toggleTrack("video", newVideoState);
        setVideoEnabled(newVideoState);

        if (!newVideoState && localVideoRef.current) {
          localVideoRef.current.style.opacity = "0.3";
        } else if (newVideoState && localVideoRef.current) {
          localVideoRef.current.style.opacity = "1";
        }
      } else {
        try {
          const stream = await mediaDeviceManager.current.getUserMedia({
            video: true,
            audio: audioEnabled,
          });

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          setVideoEnabled(true);
          setDevicePermissions((prev) => ({ ...prev, camera: true }));
        } catch (err) {
          console.error("Error starting video:", err);
          setError("Failed to access camera. Please check permissions.");
        }
      }
    } catch (err) {
      console.error("Error toggling video:", err);
      setError("Failed to toggle video");
    }
  };

  const stopVideo = () => {
    // Stop video track using MediaDeviceManager
    mediaDeviceManager.current.stopTrack("video");

    // Close the video producer on mediasoup
    mediasoupClient.current.closeProducer("video");

    setVideoEnabled(false);
    setDevicePermissions((prev) => ({ ...prev, camera: false }));
    console.log("Video stopped and producer closed");
  };

  const stopAudio = () => {
    // Stop audio track using MediaDeviceManager
    mediaDeviceManager.current.stopTrack("audio");

    // Close the audio producer on mediasoup
    mediasoupClient.current.closeProducer("audio");

    setAudioEnabled(false);
    setDevicePermissions((prev) => ({ ...prev, microphone: false }));
    console.log("Audio stopped and producer closed");
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

      // Join room - this will create both transports automatically
      await mediasoupClient.current.joinRoom("default-room");

      const stream = await mediaDeviceManager.current.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        await mediasoupClient.current.produce(videoTrack);
        setVideoEnabled(true);
        setDevicePermissions((prev) => ({ ...prev, camera: true }));
      }

      if (audioTrack) {
        await mediasoupClient.current.produce(audioTrack);
        setAudioEnabled(true);
        setDevicePermissions((prev) => ({ ...prev, microphone: true }));
      }

      setIsConnected(true);
      setConnectionStatus("connected");
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
        return "text-green-400";
      case "connecting":
        return "text-yellow-400";
      default:
        return "text-red-400";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Clean Header */}
      <div className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Fermion Stream
              </h1>
              <p className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg flex items-center gap-2">
                <span className="text-red-400">⚠</span>
                <span className="text-sm">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-400 hover:text-red-300 text-lg"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Main Video Container */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-2xl">
          
          {/* Video Area */}
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden mb-6">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${videoEnabled ? 'block' : 'hidden'}`}
            />
            
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-2xl">�</span>
                  </div>
                  <p className="text-slate-400 text-lg">Camera is off</p>
                </div>
              </div>
            )}

            {/* Live Indicator */}
            {isConnected && (
              <div className="absolute top-4 left-4">
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
              </div>
            )}

            {/* Participant Count */}
            {isConnected && (
              <div className="absolute top-4 right-4">
                <div className="bg-slate-900/80 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
                </div>
              </div>
            )}
          </div>

          {/* Clean Control Panel */}
          <div className="flex items-center justify-center gap-4">
            
            {/* Main Action Button */}
            {!isConnected ? (
              <button
                onClick={joinRoom}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl min-w-[140px] justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <span className="text-lg">●</span>
                    Go Live
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={leaveRoom}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl"
              >
                <span>■</span>
                End Stream
              </button>
            )}

            {/* Media Controls - Only show when connected */}
            {isConnected && (
              <>
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
                    audioEnabled
                      ? "bg-slate-700 hover:bg-slate-600 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                  title={audioEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  <span className="text-lg">{audioEnabled ? "🎤" : "🔇"}</span>
                </button>

                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
                    videoEnabled
                      ? "bg-slate-700 hover:bg-slate-600 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                  title={videoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  <span className="text-lg">{videoEnabled ? "📹" : "📷"}</span>
                </button>
              </>
            )}
          </div>

          {/* Connection Status */}
          {!isConnected && !isLoading && (
            <div className="text-center mt-6">
              <p className="text-slate-400 text-sm">
                Click &quot;Go Live&quot; to start your stream and connect with others
              </p>
            </div>
          )}
        </div>

        {/* Remote Participants - Only show when there are participants */}
        {participants.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              Other Participants
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map((participant, index) => (
                <RemoteParticipant
                  key={participant.id}
                  participant={participant}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stream Info - Minimized */}
        {isConnected && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-6 bg-slate-800/30 rounded-lg px-6 py-3 text-sm text-slate-400">
              <span>WebRTC • Low Latency</span>
              <span>•</span>
              <a 
                href={`/hls/${mediasoupClient.current.getSocket().id}/playlist.m3u8`}
                target="_blank"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                HLS Stream
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Clean Remote Participant Component
function RemoteParticipant({
  participant,
  index,
}: {
  participant: any;
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
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700 shadow-lg">
      <div className="relative aspect-video bg-slate-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Participant Label */}
        <div className="absolute bottom-3 left-3">
          <div className="bg-slate-900/80 text-white px-2 py-1 rounded text-sm font-medium">
            Participant {index + 1}
          </div>
        </div>

        {/* Live Indicator */}
        <div className="absolute top-3 right-3">
          <div className="bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            LIVE
          </div>
        </div>
      </div>
    </div>
  );
}
