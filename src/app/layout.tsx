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
  title: "Daily Cultivation Tracker",
  description: "Align thoughts, conduct, and habits with 真-善-忍",
  applicationName: "Daily Cultivation Tracker",
};

export const viewport: Viewport = {
  themeColor: "#c4f5f1",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
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
