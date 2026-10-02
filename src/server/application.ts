import { Auth, Hooks, Http, OAuth, WebCrypto } from "@yielded/auth";
import * as OAuthCrypto from "@yielded/auth-crypto/OAuth";
import * as OpenIdClient from "@yielded/auth-openid-client";
import { eq } from "drizzle-orm";
import { Effect, Layer, Predicate, Redacted, Schema } from "effect";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import { user } from "../lib/server/db/schema/auth";
import { AuthApi } from "../shared/auth";
import { AppAuth } from "./auth-definition";
import { Persistence, storage } from "./auth-schema";
import { OAuthStorageLive } from "./auth-storage";
import type { ServerConfig } from "./config";
import { Database, databaseLayer } from "./database";
import { WorkoutRoutes } from "./workouts";

const decodeSignIn = Schema.decodeUnknownEffect(
  AuthApi.actions.completeSignIn.route.operation.rpc.successSchema,
);

export const makeRoutes = (
  config: ServerConfig,
  google?: OAuth.ProviderDefinition,
) => {
  const keyring = (secret: string) => ({
    activeKeyId: "v1",
    keys: [{ id: "v1", material: Redacted.make(secret) }],
  });
  const http = Http.make(AppAuth, {
    origin: config.AUTH_ORIGIN,
    cookie: {
      prefix: "span-",
      secure: config.AUTH_ORIGIN.startsWith("https:"),
    },
    oauth: {
      providers: {
        google:
          google ??
          OpenIdClient.provider<never>({
            protocol: "oidc",
            issuer: "https://accounts.google.com",
            clientId: config.GOOGLE_CLIENT_ID,
            clientSecret: Redacted.make(config.GOOGLE_CLIENT_SECRET),
            tokenEndpointAuthMethod: "client_secret_post",
            scopes: ["openid", "email", "profile"],
          }),
      },
      respond: (value, { flowId }): Effect.Effect<Response> =>
        Effect.gen(function* () {
          const result = yield* decodeSignIn(value);
          const target = Predicate.isTagged(result, "RegistrationRequired")
            ? `/register?${new URLSearchParams({ flowId, reference: result.reference })}`
            : result.returnTarget;
          return new Response(null, {
            status: 303,
            headers: { location: target },
          });
        }).pipe(
          Effect.catchTag("SchemaError", () =>
            Effect.succeed(new Response(null, { status: 500 })),
          ),
        ),
    },
  });
  const claims = Layer.effect(
    AppAuth.strategies.oauth.SessionClaims,
    Effect.gen(function* () {
      const db = yield* Database;
      return {
        resolve: ({ subjectId }: { subjectId: string }) =>
          Effect.gen(function* () {
            const [account] = yield* db
              .select()
              .from(user)
              .where(eq(user.id, subjectId));
            if (!account?.enabled || account.banned) {
              return yield* OAuth.OAuthRejected.make({});
            }
            return { displayName: account.name, email: account.email };
          }).pipe(Effect.mapError(() => OAuth.OAuthUnavailable.make({}))),
      };
    }),
  );
  const dependencies = Layer.mergeAll(
    Persistence.layer.pipe(Layer.provide(Persistence.Config.layer(storage))),
    OAuthStorageLive,
    claims,
    Auth.RequestBindingConfig.layer({
      generation: 1,
      lifetimeMillis: 600_000,
      keyring: keyring(config.AUTH_BINDING_SECRET),
    }),
    OAuthCrypto.transactionLayer(keyring(config.AUTH_TRANSACTION_SECRET)),
    OAuth.OAuthReturnTargets.exactRoutes(["/"]),
    FetchHttpClient.layer,
  ).pipe(
    Layer.provideMerge(databaseLayer(config.DATABASE_URL)),
    Layer.provideMerge(WebCrypto.layerWebCrypto),
    Layer.provideMerge(Hooks.LifecycleHooks.empty),
  );
  const live = http.layer.pipe(Layer.provideMerge(dependencies));
  return Layer.merge(
    http.routes(),
    WorkoutRoutes.pipe(
      http.middleware,
      HttpRouter.provideRequest(dependencies),
    ),
  ).pipe(Layer.provide(live));
};
export const makeWebHandler = (
  config: ServerConfig,
  google?: OAuth.ProviderDefinition,
) =>
  HttpRouter.toWebHandler(
    makeRoutes(config, google).pipe(Layer.provide(HttpServer.layerServices)),
    { disableLogger: true },
  );
