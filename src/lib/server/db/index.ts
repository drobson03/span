import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "~/lib/server/db/schema";
import { getEnv } from "~/lib/server/env";

export function getDb() {
  return drizzle(getEnv().DATABASE_URL, {
    schema,
    logger: false,
  });
}
