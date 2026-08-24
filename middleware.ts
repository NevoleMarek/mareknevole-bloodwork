import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bloodwork-session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip the login page, session creation, and public dashboard reads.
  if (
    pathname === "/admin" ||
    pathname.startsWith("/api/session") ||
    (pathname === "/api/changelog" && req.method === "GET")
  ) {
    return NextResponse.next();
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
    "/api/readings/:path*",
    "/api/vocabulary/:path*",
    "/api/supplements/:path*",
    "/api/changelog/:path*",
    "/api/health/:path*",
    "/api/import/:path*",
  ],
};
