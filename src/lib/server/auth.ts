import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, oAuthProxy } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "~/lib/server/db";
import * as schema from "~/lib/server/db/schema";
import { env } from "~/lib/server/env";

function createAuth() {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
      .split(",")
      .filter(Boolean),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    plugins: [
      admin(),
      oAuthProxy({
        productionURL: env.OAUTH_PROXY_PRODUCTION_URL,
        secret: env.OAUTH_PROXY_SECRET,
      }),
      tanstackStartCookies(),
    ],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

// Worker bindings can only be read once a request is running.
export function getAuth() {
  auth ??= createAuth();
  return auth;
}
