"use client";

import { useEffect, useRef } from "react";

interface Participant {
  id: string;
  track: MediaStreamTrack;
}

interface ParticipantsGridProps {
  participants: Participant[];
}

function RemoteParticipant({
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

export default function ParticipantsGrid({
  participants,
}: ParticipantsGridProps) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-white mb-4">
        Other Participants ({participants.length})
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
  );
}
