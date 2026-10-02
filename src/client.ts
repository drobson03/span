import { Client } from "@yielded/auth";
import { Effect, Schema } from "effect";
import { AuthApi } from "./shared/auth";
export const AppClient = Client.make(AuthApi, {
  baseUrl: window.location.origin,
});
export const request = (path: string, method = "GET", data?: unknown) =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(path, {
        method,
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-span-csrf": "1",
          "x-effect-auth-csrf": "1",
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
      if (!res.ok)
        throw new Error(
          res.status === 401
            ? "Your session expired. Sign in again."
            : res.status === 400
              ? "Check the workout fields."
              : "Unable to save or load workouts. Please try again.",
        );
      return res.json() as Promise<unknown>;
    },
    catch: (error) =>
      error instanceof Error ? error : new Error("Network request failed"),
  });
export const decodeResponse =
  <A, I>(schema: Schema.Codec<A, I>) =>
  (body: unknown) =>
    Schema.decodeUnknownEffect(schema)(body);
