import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "My Day",
  description: "Countdown · 農曆 · Today's to-dos",
  applicationName: "My Day",
  appleWebApp: { capable: true, title: "My Day" },
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f4ef",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant" className={`${geist.variable} h-full`}>
      <body className="h-full font-[var(--font-sans)]">{children}</body>
    </html>
  )
}
