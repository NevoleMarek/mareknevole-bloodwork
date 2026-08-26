import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { getSecurityHeaders } from "./lib/security-headers";

initOpenNextCloudflareForDev({ configPath: "wrangler.dev.jsonc" });

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: getSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
