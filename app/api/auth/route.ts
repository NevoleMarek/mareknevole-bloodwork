import { cookies } from "next/headers";

const SESSION_COOKIE = "bloodwork-session";

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const hashA = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(a)),
  );
  const hashB = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(b)),
  );
  let mismatch = 0;
  for (let i = 0; i < hashA.length; i++) mismatch |= hashA[i] ^ hashB[i];
  return mismatch === 0;
}
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !(await timingSafeEqual(password, adminPassword))) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
