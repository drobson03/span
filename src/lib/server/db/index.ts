import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "~/lib/server/db/schema";
import { env } from "~/lib/server/env";

export const db = drizzle(env.DATABASE_URL, {
  schema,
  logger: process.env.NODE_ENV !== "production",
});
