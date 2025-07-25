import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const hlsPath = path.join(process.cwd(), "public", "hls");

    if (!fs.existsSync(hlsPath)) {
      return NextResponse.json({
        success: false,
        message: "No streams directory found",
      });
    }

    // Get all stream directories
    const streamDirs = fs
      .readdirSync(hlsPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => name !== "default-room"); // Skip our test directory

    if (streamDirs.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No active streams found",
      });
    }

    // Find the most recent active stream
    let activeStream = null;
    let latestTime = 0;

    for (const streamDir of streamDirs) {
      const playlistPath = path.join(hlsPath, streamDir, "playlist.m3u8");

      if (fs.existsSync(playlistPath)) {
        const stats = fs.statSync(playlistPath);
        if (stats.mtime.getTime() > latestTime) {
          latestTime = stats.mtime.getTime();
          activeStream = streamDir;
        }
      }
    }

    if (!activeStream) {
      return NextResponse.json({
        success: false,
        message: "No active playlists found",
      });
    }

    // Check if the stream is actually live (updated recently)
    const timeDiff = Date.now() - latestTime;
    const isLive = timeDiff < 30000; // Consider live if updated within 30 seconds

    return NextResponse.json({
      success: true,
      streamUrl: `/hls/${activeStream}/playlist.m3u8`,
      streamId: activeStream,
      isLive,
      lastUpdated: new Date(latestTime).toISOString(),
      availableStreams: streamDirs.map((dir) => ({
        id: dir,
        url: `/hls/${dir}/playlist.m3u8`,
      })),
    });
  } catch (error) {
    console.error("Error finding active streams:", error);
    return NextResponse.json({
      success: false,
      message: "Error checking for active streams",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
