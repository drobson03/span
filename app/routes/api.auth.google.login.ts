import { createAPIFileRoute } from "@tanstack/start/api";
import { generateCodeVerifier, generateState } from "arctic";
import { setCookie } from "vinxi/http";
import { google } from "~/server/auth";

export const APIRoute = createAPIFileRoute("/api/auth/google/login")({
  GET: () => {
    const state = generateState();
    const verifier = generateCodeVerifier();

    const url = google.createAuthorizationURL(state, verifier, [
      "openid",
      "profile",
      "email",
    ]);

    setCookie("google_oauth_state", state, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "lax",
    });

    setCookie("google_oauth_verifier", verifier, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "lax",
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
      },
    });
  },
});
