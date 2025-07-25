import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Fermion WebRTC-HLS Platform
          </h1>
          <p className="text-xl text-gray-600">
            Real-time streaming with WebRTC and HLS playback
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">
              Stream (WebRTC)
            </h2>
            <p className="text-gray-600 mb-6">
              Join as a participant. Turn on your camera and microphone to
              stream live via WebRTC.
            </p>
            <Link
              href="/stream"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Join Stream
            </Link>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-green-600">
              Watch (HLS)
            </h2>
            <p className="text-gray-600 mb-6">
              Watch the live stream as an HLS viewer. No camera/microphone
              required.
            </p>
            <Link
              href="/watch"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Watch Stream
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
