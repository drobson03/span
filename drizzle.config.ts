import type { Config } from "drizzle-kit";
import { env } from "~/server/env";

export default {
  schema: "./src/server/schema.ts",
  driver: "turso",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
