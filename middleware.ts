import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bloodwork-session";
export const PUBLIC_DASHBOARD_UNAVAILABLE_STATUS = 503;
export const PUBLIC_DASHBOARD_RETRY_AFTER_SECONDS = 60;

const PUBLIC_DASHBOARD_UNAVAILABLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Bloodwork — temporarily unavailable</title>
  </head>
  <body>
    <main id="main-content" role="alert" aria-labelledby="public-dashboard-error-title" aria-describedby="public-dashboard-error-description">
      <p>Service unavailable</p>
      <h1 id="public-dashboard-error-title">Bloodwork is temporarily unavailable.</h1>
      <p id="public-dashboard-error-description">We couldn\'t load the public dashboard right now. Please try again in a moment.</p>
      <form action="/" method="get">
        <button type="submit">Try again</button>
      </form>
    </main>
  </body>
</html>`;

/**
 * Return a response that cannot be retained or indexed while D1 is down.
 * This runs before the App Router page so the Worker can preserve the proper
 * HTTP status instead of turning an expected outage into a 200 page render.
 */
export function publicDashboardUnavailableResponse(): NextResponse {
  return new NextResponse(PUBLIC_DASHBOARD_UNAVAILABLE_HTML, {
    status: PUBLIC_DASHBOARD_UNAVAILABLE_STATUS,
    headers: {
      "cache-control": "no-store, max-age=0",
      "content-type": "text/html; charset=utf-8",
      "retry-after": String(PUBLIC_DASHBOARD_RETRY_AFTER_SECONDS),
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

async function isPublicDashboardPersistenceAvailable(): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    if (!env.DB) return false;
    await env.DB.prepare("SELECT 1").first();
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    if (!(await isPublicDashboardPersistenceAvailable())) {
      return publicDashboardUnavailableResponse();
    }

    return NextResponse.next();
  }

  // This middleware only controls page navigation. API authentication is
  // performed by the shared HttpApi security middleware, which verifies the
  // signed session token rather than trusting cookie presence.
  if (pathname === "/admin") return NextResponse.next();

  const session = req.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};
