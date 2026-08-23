import { getCachedHealth } from "@/lib/data-cache";
import { createHealthHandler } from "@/app/api/public/health/handler";

export const GET = createHealthHandler({ getHealth: getCachedHealth });
