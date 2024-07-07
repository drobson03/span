import { generateCodeVerifier, generateState } from "arctic";

import type { APIEvent } from "@solidjs/start/server";
import { sendRedirect, setCookie } from "vinxi/http";
import { google } from "~/server/auth";

export async function GET(event: APIEvent) {
  const state = generateState();
  const verifier = generateCodeVerifier();

  const url = google.createAuthorizationURL(state, verifier);
  url.addScopes("openid", "profile", "email");

  setCookie(event.nativeEvent, "google_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  setCookie(event.nativeEvent, "google_oauth_verifier", verifier, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return sendRedirect(event.nativeEvent, url.toString());
}
