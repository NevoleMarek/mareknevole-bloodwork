import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bloodwork-session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
  matcher: ["/admin/:path*"],
};
