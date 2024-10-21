import type { Config } from "drizzle-kit";
import { env } from "~/server/env";

export default {
  schema: "./app/server/db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
