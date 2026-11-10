import type { NextConfig } from "next"

const onGitHubPages = process.env.GITHUB_PAGES === "true"

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1", "**.agent.cvm.dev", "**.trycloudflare.com"],
  ...(onGitHubPages
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
}

export default nextConfig
