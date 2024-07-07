import { createMiddleware } from "@solidjs/start/middleware";
import { type Session, type User, verifyRequestOrigin } from "lucia";
import { appendHeader, getCookie, getHeader } from "vinxi/http";
import { lucia } from "~/server/auth";

export default createMiddleware({
  onRequest: [
    (event) => {
      if (event.request.method !== "GET") {
        const originHeader = getHeader(event.nativeEvent, "Origin") ?? null;
        const hostHeader = getHeader(event.nativeEvent, "Host") ?? null;
        if (
          !originHeader ||
          !hostHeader ||
          !verifyRequestOrigin(originHeader, [hostHeader])
        ) {
          return new Response("", { status: 403 });
        }
      }
    },
    async (event) => {
      const sessionId =
        getCookie(event.nativeEvent, lucia.sessionCookieName) ?? null;
      if (!sessionId) {
        event.locals.session = null;
        event.locals.user = null;
      } else {
        const { session, user } = await lucia.validateSession(sessionId);
        if (session?.fresh) {
          appendHeader(
            event.nativeEvent,
            "Set-Cookie",
            lucia.createSessionCookie(session.id).serialize(),
          );
        }
        if (!session) {
          appendHeader(
            event.nativeEvent,
            "Set-Cookie",
            lucia.createBlankSessionCookie().serialize(),
          );
        }
        event.locals.session = session;
        event.locals.user = user;
      }
    },
  ],
});

declare module "@solidjs/start/server" {
  interface RequestEventLocals {
    user: User | null;
    session: Session | null;
  }
}
