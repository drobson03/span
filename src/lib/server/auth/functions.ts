import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getResponseHeaders, getRequest } from "@tanstack/react-start/server";
import { getEnv } from "~/lib/server/env";

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest()!;

  const result = await getEnv().AUTH.getSession(
    Object.fromEntries(request.headers),
  );
  if (!("session" in result)) throw new Error("Authentication service failed");
  const { session, cookies } = result;
  for (const cookie of cookies)
    getResponseHeaders().append("set-cookie", cookie);

  return { session: session?.session, user: session?.user };
});

export const getUserQueryOptions = queryOptions({
  queryKey: ["getUser"],
  queryFn: async () => (await getUser()).user,
});
