import { cache, redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

export const getAuthenticatedUser = cache(async () => {
  "use server";
  const event = getRequestEvent()!;

  if (!event.locals.user) {
    throw redirect("/login");
  }

  return event.locals.user;
}, "user");

export function chunk<T>(array: T[] = [], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size),
  );
}
