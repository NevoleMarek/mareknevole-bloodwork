import { cookies } from "next/headers";

const SESSION_COOKIE = "bloodwork-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
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
