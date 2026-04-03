import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bloodwork-session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip the login page itself and the auth API
  if (pathname === "/admin" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Health metrics API accepts bearer token OR session cookie
  if (pathname.startsWith("/api/health-metrics")) {
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7);
      if (token && token === process.env.HEALTH_API_TOKEN) {
        return NextResponse.next();
      }
    }
    // Fall through to session cookie check below
  }

  const session = req.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path+",
    "/api/extract/:path*",
    "/api/map/:path*",
    "/api/readings/:path*",
    "/api/vocabulary/:path*",
    "/api/supplements/:path*",
    "/api/changelog/:path*",
    "/api/health-metrics/:path*",
  ],
};
