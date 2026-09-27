import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, oAuthProxy } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getDb } from "~/lib/server/db";
import * as schema from "~/lib/server/db/schema";
import { getEnv } from "~/lib/server/env";

// Create auth inside requests, when the website's bindings are available.
export function getAuth() {
  const env = getEnv();

  return betterAuth({
    basePath: "/api/auth",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      admin(),
      oAuthProxy({
        productionURL: "https://span.darcyr.dev",
        secret: env.OAUTH_PROXY_SECRET,
      }),
      tanstackStartCookies(),
    ],
  });
}
