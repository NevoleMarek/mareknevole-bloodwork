import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev({ configPath: "wrangler.dev.jsonc" });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
