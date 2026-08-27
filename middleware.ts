import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bloodwork-session";
const PRODUCTION_ORIGIN = "https://bloodwork.mareknevole.com";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLocalDevelopment() {
  const environment = process.env.NEXTJS_ENV ?? process.env.NODE_ENV;
  return environment === "development" || environment === "test";
}

function getLoginUrl(req: NextRequest) {
  const origin =
    isLocalDevelopment() && LOCAL_HOSTNAMES.has(req.nextUrl.hostname)
      ? req.nextUrl.origin
      : PRODUCTION_ORIGIN;

  return new URL("/admin", origin);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // This middleware only controls page navigation. API authentication is
  // performed by the shared HttpApi security middleware, which verifies the
  // signed session token rather than trusting cookie presence.
  if (pathname === "/admin") return NextResponse.next();

  const session = req.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    return NextResponse.redirect(getLoginUrl(req));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
