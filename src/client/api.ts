import { Client } from "@yielded/auth";
import { Effect, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { AuthApi } from "../shared/auth";

export const AppClient = Client.make(AuthApi, {
  baseUrl: window.location.origin,
});
export class RequestFailure extends Schema.TaggedError<RequestFailure>()(
  "RequestFailure",
  { message: Schema.String },
) {}
export const request = (
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: unknown,
) =>
  Effect.gen(function* () {
    const base = HttpClientRequest.make(method)(path, {
      headers: {
        "content-type": "application/json",
        "x-span-csrf": "1",
        "x-effect-auth-csrf": "1",
      },
    });
    const outgoing =
      data === undefined ? base : yield* HttpClientRequest.bodyJson(base, data);
    const response = yield* HttpClient.execute(outgoing).pipe(
      Effect.mapError(
        () => new RequestFailure({ message: "Network request failed" }),
      ),
    );
    if (response.status < 200 || response.status >= 300) {
      return yield* new RequestFailure({
        message:
          response.status === 401
            ? "Your session expired. Sign in again."
            : response.status === 400
              ? "Check the workout fields."
              : "Unable to save or load workouts. Please try again.",
      });
    }
    return yield* response.json.pipe(
      Effect.mapError(
        () =>
          new RequestFailure({
            message: "Unable to read the server response.",
          }),
      ),
    );
  }).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.provideService(FetchHttpClient.RequestInit, {
      credentials: "same-origin",
    }),
  );
