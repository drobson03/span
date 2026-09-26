import { BetterAuth } from "@alchemy.run/better-auth";
import { admin, oAuthProxy } from "better-auth/plugins";
import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

const makeAuth = Effect.gen(function* () {
  const baseURL = yield* Config.String("BETTER_AUTH_URL");
  const secret = yield* Config.Redacted("BETTER_AUTH_SECRET");
  const clientId = yield* Config.String("GOOGLE_CLIENT_ID");
  const clientSecret = yield* Config.Redacted("GOOGLE_CLIENT_SECRET");
  const proxySecret = yield* Config.Redacted("OAUTH_PROXY_SECRET");
  const origins = yield* Config.String("BETTER_AUTH_TRUSTED_ORIGINS").pipe(
    Config.withDefault(""),
  );

  return yield* BetterAuth({
    basePath: "/api/auth",
    baseURL,
    secret,
    // The populated Drizzle schema remains the source of truth.
    migrate: false,
    trustedOrigins: origins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: { clientId, clientSecret: Redacted.value(clientSecret) },
    },
    plugins: [
      admin(),
      oAuthProxy({
        productionURL: "https://span.darcyr.dev",
        secret: Redacted.value(proxySecret),
      }),
    ],
  });
});

export class Auth extends Context.Service<
  Auth,
  Effect.Success<typeof makeAuth>
>()("span/Auth") {
  static readonly layer = Layer.effect(Auth, makeAuth);
}
