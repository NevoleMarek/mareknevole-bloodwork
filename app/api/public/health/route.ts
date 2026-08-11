import { getCachedHealth } from "@/lib/data-cache";
import { isPeriod } from "@/lib/period";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("period");
  if (!isPeriod(value)) {
    return Response.json({ error: "Invalid period" }, { status: 400 });
  }

  return Response.json(await getCachedHealth(value));
}
