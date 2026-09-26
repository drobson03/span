import { Drizzle } from "@alchemy.run/better-auth/Drizzle";
import * as Cloudflare from "alchemy/Cloudflare";
import { drizzle } from "drizzle-orm/neon-http";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Output from "alchemy/Output";
import * as Redacted from "effect/Redacted";
import { Database } from "../../infra/database";
import * as schema from "../lib/server/db/schema";
import { Auth } from "./service";

const AuthDatabase = Layer.unwrap(
  Effect.gen(function* () {
    const database = yield* Database;
    const connection = yield* Output.named(
      Output.map(database.pooledConnectionUri, Redacted.make),
      "AUTH_DATABASE_URL",
    );
    return Drizzle(
      Effect.map(
        connection,
        (url) =>
          drizzle(Redacted.value(url), { schema }) as unknown as Record<
            string,
            unknown
          >,
      ),
      { provider: "pg", schema },
    );
  }),
);

export default class AuthApi extends Cloudflare.Worker<AuthApi>()(
  "AuthApi",
  {
    main: import.meta.url,
    workersDev: false,
    compatibility: { date: "2026-09-01", flags: ["nodejs_compat"] },
  },
  Effect.gen(function* () {
    const auth = yield* Auth;
    return {
      fetch: auth.fetch,
      getSession: (headers: Record<string, string>) =>
        Effect.gen(function* () {
          const instance = yield* auth.auth;
          const result = yield* Effect.promise(() =>
            instance.api.getSession({
              headers: new Headers(headers),
              query: { disableCookieCache: true },
              returnHeaders: true,
            }),
          );
          return {
            session: result.response,
            cookies: result.headers.getSetCookie(),
          };
        }),
    };
  }).pipe(Effect.provide(Auth.layer.pipe(Layer.provide(AuthDatabase)))),
) {}
