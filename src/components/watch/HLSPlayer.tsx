"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface HLSPlayerProps {
  src: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
  onLoadedData?: () => void;
  onError?: (error: any) => void;
}

export default function HLSPlayer({
  src,
  autoPlay = false,
  controls = true,
  className = "",
  onLoadedData,
  onError,
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHlsSupported, setIsHlsSupported] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Check if HLS is supported
    if (Hls.isSupported()) {
      setIsHlsSupported(true);

      // Create HLS instance
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      // Attach to video element
      hls.attachMedia(video);

      // Handle HLS events
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("HLS media attached");
        hls.loadSource(src);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest parsed");
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(console.error);
        }
        onLoadedData?.();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          setError(`HLS Error: ${data.details}`);
          onError?.(data);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      setIsHlsSupported(true);
      video.src = src;

      video.addEventListener("loadeddata", () => {
        setIsLoading(false);
        onLoadedData?.();
      });

      video.addEventListener("error", (e) => {
        setError("Video playback error");
        onError?.(e);
      });

      if (autoPlay) {
        video.play().catch(console.error);
      }
    } else {
      setError("HLS is not supported in this browser");
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay, onLoadedData, onError]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900 ${className}`}
      >
        <div className="text-center text-red-400">
          <p className="mb-2">⚠ {error}</p>
          <p className="text-sm text-slate-500">
            {!isHlsSupported && "Your browser doesn't support HLS streaming"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        controls={controls}
        autoPlay={autoPlay}
        playsInline
        className="w-full h-full object-cover"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Loading stream...</p>
          </div>
        </div>
      )}
    </div>
  );
}
