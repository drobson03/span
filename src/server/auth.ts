import { betterAuth } from "better-auth";
import { reactStartCookies } from "better-auth/react-start";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "./env";
import { db } from "./db";

export const auth = betterAuth({
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
  }),
  plugins: [admin(), reactStartCookies()],
});
