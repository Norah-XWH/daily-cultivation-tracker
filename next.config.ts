import type { NextConfig } from "next";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const onGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath =
  onGitHubPages && repository.length > 0 && !repository.endsWith(".github.io")
    ? `/${repository}`
    : "";

const nextConfig: NextConfig = {
  // Cursor opens this dev server through a preview host, not localhost.
  // Without this, Next.js blocks the page's styles and scripts, so the tab looks blank.
  allowedDevOrigins: ["127.0.0.1", "**.agent.cvm.dev", "**.trycloudflare.com"],
  ...(onGitHubPages
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath || undefined,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        cacheComponents: true,
        partialPrefetching: true,
      }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
