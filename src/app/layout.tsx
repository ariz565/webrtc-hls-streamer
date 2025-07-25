import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fermion WebRTC-HLS Streaming',
  description: 'Real-time WebRTC streaming with HLS playback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="bg-gray-900 text-white p-4">
          <h1 className="text-xl font-bold">Fermion Streaming Platform</h1>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
