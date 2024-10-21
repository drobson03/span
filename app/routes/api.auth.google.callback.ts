import { createAPIFileRoute } from "@tanstack/start/api";
import { decodeIdToken, OAuth2RequestError } from "arctic";
import { eq } from "drizzle-orm";
import { email, parse, object, pipe, string } from "valibot";
import { getCookie, getQuery, setCookie } from "vinxi/http";
import { createSession, generateSessionToken, google } from "~/server/auth";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";

export const Route = createAPIFileRoute("/api/auth/google/callback")({
  GET: async () => {
    const query = getQuery();

    const code = query.code?.toString();
    const state = query.state?.toString();

    const storedState = getCookie("google_oauth_state");
    const codeVerifier = getCookie("google_oauth_verifier");

    if (
      !code ||
      !state ||
      !storedState ||
      state !== storedState ||
      !codeVerifier
    ) {
      return new Response(null, {
        status: 400,
      });
    }

    try {
      const tokens = await google.validateAuthorizationCode(code, codeVerifier);
      const claims = parse(GoogleUserSchema, decodeIdToken(tokens.idToken()));

      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.googleId, claims.sub))
        .get();

      if (existingUser) {
        const sessionToken = generateSessionToken();
        const session = await createSession(sessionToken, existingUser.id);

        setCookie("auth_session", sessionToken, {
          path: "/",
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          expires: session.expiresAt,
          sameSite: "lax",
        });

        return new Response(null, {
          status: 302,
          headers: {
            Location: "/",
          },
        });
      }

      const newUser = await db
        .insert(user)
        .values({
          name: claims.name,
          email: claims.email,
          googleId: claims.sub,
        })
        .returning({ id: user.id });

      if (newUser.length < 1) {
        return new Response(null, {
          status: 500,
        });
      }

      const userId = newUser[0]!.id;

      const sessionToken = generateSessionToken();
      const session = await createSession(sessionToken, userId);

      setCookie("auth_session", sessionToken, {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        expires: session.expiresAt,
        sameSite: "lax",
      });

      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
        },
      });
    } catch (e) {
      if (
        e instanceof OAuth2RequestError &&
        e.message === "bad_verification_code"
      ) {
        // invalid code
        return new Response(null, {
          status: 400,
        });
      }
    }

    return new Response(null, {
      status: 500,
    });
  },
});

const GoogleUserSchema = object({
  sub: string(),
  name: string(),
  email: pipe(string(), email()),
});
