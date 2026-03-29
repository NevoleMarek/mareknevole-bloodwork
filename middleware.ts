import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bloodwork-session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip the login page itself and the auth API
  if (pathname === "/admin" || pathname.startsWith("/api/auth")) {
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
    "/api/extract/:path*",
    "/api/vocabulary/:path*",
    "/api/supplements/:path*",
  ],
};
