import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { getCookie, setCookie } from "vinxi/http";
import { validateSessionToken } from "~/server/auth";

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie("auth_session");
  if (!token) {
    return { session: null, user: null };
  }

  const { session, user } = await validateSessionToken(token);

  if (session) {
    setCookie("auth_session", token, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      expires: session.expiresAt,
      sameSite: "lax",
    });
  } else {
    setCookie("auth_session", "", {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
    });
  }

  return { session, user };
});

export const getUserQueryOptions = queryOptions({
  queryKey: ["getUser"],
  queryFn: async () => (await getUser()).user,
});
