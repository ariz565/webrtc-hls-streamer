"use client";

import { useState, useEffect, useRef } from "react";
import { MediaDeviceManager } from "@/lib/webrtc/media-devices";
import { MediasoupClient } from "@/lib/webrtc/mediasoup-client";

export default function StreamPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaDeviceManager = MediaDeviceManager.getInstance();
  const mediasoupClient = MediasoupClient.getInstance();

  useEffect(() => {
    console.log("Stream page loaded");

    // Listen for new remote streams
    const handleNewRemoteStream = (event: any) => {
      const { track, consumerId } = event.detail;
      setParticipants((prev) => [...prev, { id: consumerId, track }]);
    };

    window.addEventListener("newRemoteStream", handleNewRemoteStream);

    return () => {
      window.removeEventListener("newRemoteStream", handleNewRemoteStream);
      mediaDeviceManager.stopLocalStream();
    };
  }, []);

  const toggleAudio = async () => {
    if (isConnected) {
      mediaDeviceManager.toggleTrack("audio", !audioEnabled);
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = async () => {
    try {
      if (!isConnected) {
        // Start video first time
        const stream = await mediaDeviceManager.getUserMedia({
          video: true,
          audio: audioEnabled,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setVideoEnabled(true);
      } else {
        // Toggle existing video
        mediaDeviceManager.toggleTrack("video", !videoEnabled);
        setVideoEnabled(!videoEnabled);
      }
    } catch (err) {
      console.error("Error toggling video:", err);
      setError("Failed to access camera");
    }
  };

  const joinRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Join mediasoup room
      await mediasoupClient.joinRoom("default-room");

      // Create transports
      await mediasoupClient.createProducerTransport();
      await mediasoupClient.createConsumerTransport();

      // Get user media
      const stream = await mediaDeviceManager.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Produce video and audio tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        await mediasoupClient.produce(videoTrack);
        setVideoEnabled(true);
      }

      if (audioTrack) {
        await mediasoupClient.produce(audioTrack);
        setAudioEnabled(true);
      }

      setIsConnected(true);
      console.log("Successfully joined room and started producing");
    } catch (err: any) {
      console.error("Error joining room:", err);
      setError(err.message || "Failed to join room");
    } finally {
      setIsLoading(false);
    }
  };

  const leaveRoom = () => {
    mediasoupClient.leaveRoom();
    mediaDeviceManager.stopLocalStream();

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setIsConnected(false);
    setAudioEnabled(false);
    setVideoEnabled(false);
    setParticipants([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">WebRTC Stream</h1>
          <p className="text-gray-300">
            Status: {isConnected ? "Connected" : "Disconnected"}
          </p>
          {error && (
            <div className="mt-2 p-3 bg-red-600 text-white rounded">
              Error: {error}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={joinRoom}
            disabled={isConnected || isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isLoading ? "Joining..." : "Join Room"}
          </button>
          <button
            onClick={leaveRoom}
            disabled={!isConnected}
            className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Leave Room
          </button>
          <button
            onClick={toggleAudio}
            disabled={!isConnected}
            className={`px-4 py-2 rounded disabled:opacity-50 ${
              audioEnabled ? "bg-blue-600" : "bg-gray-600"
            }`}
          >
            {audioEnabled ? "Mute" : "Unmute"}
          </button>
          <button
            onClick={toggleVideo}
            className={`px-4 py-2 rounded ${
              videoEnabled ? "bg-blue-600" : "bg-gray-600"
            }`}
          >
            {videoEnabled ? "Stop Video" : "Start Video"}
          </button>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local Video */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">You (Local)</h3>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-64 bg-gray-700 rounded"
            />
            <div className="mt-2 flex gap-2">
              <span
                className={`px-2 py-1 rounded text-xs ${
                  audioEnabled ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {audioEnabled ? "🎤" : "🔇"}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  videoEnabled ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {videoEnabled ? "📹" : "📷"}
              </span>
            </div>
          </div>

          {/* Remote Participants */}
          {participants.map((participant, index) => (
            <RemoteParticipant
              key={participant.id}
              participant={participant}
              index={index}
            />
          ))}

          {/* Placeholder for empty slots */}
          {participants.length === 0 && isConnected && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">
                Waiting for participants...
              </h3>
              <div className="w-full h-64 bg-gray-700 rounded flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <span className="text-gray-400">No remote participants</span>
                </div>
              </div>
            </div>
          )}

          {!isConnected && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Get Started</h3>
              <div className="w-full h-64 bg-gray-700 rounded flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🚀</div>
                  <span className="text-gray-400">
                    Click &quot;Join Room&quot; to start streaming
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stream Info */}
        {isConnected && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Participants</h3>
              <p className="text-gray-300">
                {participants.length + 1} connected
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Protocol</h3>
              <p className="text-gray-300">WebRTC (Mediasoup SFU)</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">HLS Stream</h3>
              <p className="text-gray-300">
                <a
                  href={`/hls/${mediasoupClient.getSocket().id}/playlist.m3u8`}
                  target="_blank"
                  className="text-blue-400 hover:underline"
                >
                  View HLS Playlist
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Remote participant component
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
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-2">Participant {index + 1}</h3>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-64 bg-gray-700 rounded"
      />
      <div className="mt-2">
        <span className="px-2 py-1 bg-blue-600 rounded text-xs">
          Remote Stream
        </span>
      </div>
    </div>
  );
}
