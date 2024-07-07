import { ArcticFetchError, OAuth2RequestError } from "arctic";
import { generateId } from "lucia";
import { google, lucia } from "~/server/auth";
import { db } from "~/server/db";

import type { APIEvent } from "@solidjs/start/server";
import {
  appendHeader,
  createError,
  getCookie,
  getQuery,
  sendRedirect,
} from "vinxi/http";
import { user } from "~/server/schema";
import { eq } from "drizzle-orm";

export async function GET(event: APIEvent) {
  const query = getQuery(event.nativeEvent);
  const code = query.code?.toString() ?? null;
  const state = query.state?.toString() ?? null;
  const storedState =
    getCookie(event.nativeEvent, "google_oauth_state") ?? null;
  const verifier =
    getCookie(event.nativeEvent, "google_oauth_verifier") ?? null;
  if (!code || !state || !storedState || state !== storedState || !verifier) {
    throw createError({
      status: 400,
    });
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, verifier);
    const googleUserResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
        },
      },
    );

    const googleUser: GoogleUser = await googleUserResponse.json();
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.googleId, googleUser.sub))
      .get();

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {});
      appendHeader(
        event.nativeEvent,
        "Set-Cookie",
        lucia.createSessionCookie(session.id).serialize(),
      );
      return sendRedirect(event.nativeEvent, "/");
    }

    const userId = generateId(15);
    await db.insert(user).values({
      id: userId,
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.sub,
    });
    const session = await lucia.createSession(userId, {});
    appendHeader(
      event.nativeEvent,
      "Set-Cookie",
      lucia.createSessionCookie(session.id).serialize(),
    );
    return sendRedirect(event.nativeEvent, "/");
  } catch (e) {
    if (
      e instanceof OAuth2RequestError &&
      e.message === "bad_verification_code"
    ) {
      // invalid code
      throw createError({
        status: 400,
      });
    }

    throw createError({
      status: 500,
    });
  }
}

interface GoogleUser {
  sub: string;
  name: string;
  email: string;
}
