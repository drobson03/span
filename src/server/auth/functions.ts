import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "../auth";

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
  const request = getWebRequest()!;

  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });

  return { session: session?.session, user: session?.user };
});

export const getUserQueryOptions = queryOptions({
  queryKey: ["getUser"],
  queryFn: async () => (await getUser()).user,
});
