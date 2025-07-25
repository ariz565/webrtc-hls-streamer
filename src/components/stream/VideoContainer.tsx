"use client";

import { forwardRef } from "react";

interface VideoContainerProps {
  isConnected: boolean;
  videoEnabled: boolean;
  participantCount: number;
  children?: React.ReactNode;
}

const VideoContainer = forwardRef<HTMLVideoElement, VideoContainerProps>(
  ({ isConnected, videoEnabled, participantCount, children }, ref) => {
    return (
      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden mb-6">
        <video
          ref={ref}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${
            videoEnabled ? "block" : "hidden"
          }`}
        />

        {!videoEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-2xl">📷</span>
              </div>
              <p className="text-slate-400 text-lg">
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
              {participantCount} participant{participantCount !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {children}
      </div>
    );
  }
);

VideoContainer.displayName = "VideoContainer";

export default VideoContainer;
