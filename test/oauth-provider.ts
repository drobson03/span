import { randomBytes } from "node:crypto";
import { OAuth } from "@yielded/auth";
import { Effect, Redacted, Schema } from "effect";

// Only Google's external protocol is replaced. HTTP, cookies, crypto,
// durable flows, registration, sessions, and PostgreSQL adapters are real.
const decodeConfiguration = Schema.decodeUnknownSync(
  OAuth.OAuthProtocolConfiguration,
);
const decodeIdentity = Schema.decodeUnknownSync(OAuth.OAuthExternalIdentity);
export const google: OAuth.ProviderDefinition = {
  configure: ({ provider, callbacks }) =>
    Effect.succeed({
      prepareAuthorization: () =>
        Effect.sync(() => {
          const state = randomBytes(32).toString("base64url");
          return {
            configuration: decodeConfiguration({
              provider,
              protocol: "oidc",
              configurationGeneration: 1,
              issuer: "https://accounts.google.com",
              responseIssuerMode: "required",
              ...callbacks[0],
            }),
            authorizationUrl: Redacted.make(
              `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
            ),
            secrets: {
              namespace: "effect-auth/oauth-transaction-secrets/v1" as const,
              state: Redacted.make(state),
              pkceVerifier: Redacted.make(
                randomBytes(32).toString("base64url"),
              ),
              oidcNonce: Redacted.make(randomBytes(32).toString("base64url")),
            },
          };
        }),
      exchangeVerifiedIdentity: () =>
        Effect.succeed({
          identity: decodeIdentity({
            provider,
            issuer: "https://accounts.google.com",
            subject: "google-new-subject",
          }),
          profile: {
            displayName: "Google user",
            email: "new@example.com",
            emailVerified: true,
          },
        }),
    }),
};
