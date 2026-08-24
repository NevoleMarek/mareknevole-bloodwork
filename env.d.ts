import type { D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    ASSETS: Fetcher;
    ADMIN_PASSWORD: string;
    HEALTH_API_TOKEN: string;
    GEMINI_API_KEY: string;
    NEXTJS_ENV: string;
  }
}

export {};
