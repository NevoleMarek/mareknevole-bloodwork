import { cookies } from "next/headers";
import * as Effect from "effect/Effect";

import { Auth } from "@/lib/effect/services";
import { decodeJson, provideAppLayer, runRouteValue } from "@/lib/effect/http";
import { LoginRequest } from "@/lib/schemas/wire";

const SESSION_COOKIE = "bloodwork-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  const result = await runRouteValue(
    provideAppLayer(
      Effect.gen(function* () {
        const body = yield* decodeJson(request, LoginRequest, "auth.login");
        const auth = yield* Auth;
        return yield* auth.authenticate(body.password);
      }),
    ),
  );
  if (result._tag === "Failure") return result.response;

  const body = result.value;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, body.token, {
    httpOnly: true,
    secure: body.secure,
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
