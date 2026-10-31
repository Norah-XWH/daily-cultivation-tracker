import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const oldStyle = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  style: "italic",
  weight: ["500", "600"],
});

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://daily.zhengnian.win"),
  title: "Daily Cultivation Tracker",
  description: "Align thoughts, conduct, and habits with 真-善-忍",
  applicationName: "Daily Cultivation Tracker",
  appleWebApp: {
    capable: true,
    title: "Daily Cultivation Tracker",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Daily Cultivation Tracker",
    description: "Align thoughts, conduct, and habits with 真-善-忍",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "正" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Cultivation Tracker",
    description: "Align thoughts, conduct, and habits with 真-善-忍",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#c4f5f1",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} ${oldStyle.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
