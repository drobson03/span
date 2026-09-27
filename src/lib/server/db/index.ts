import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "~/lib/server/db/schema";
import { getEnv } from "~/lib/server/env";

export function getDb() {
  // Construct clients inside the request. Hyperdrive owns the origin pool;
  // discard each client after use so no sockets survive across requests.
  const pool = new Pool({
    connectionString: getEnv().HYPERDRIVE.connectionString,
    max: 5,
    maxUses: 1,
    connectionTimeoutMillis: 10_000,
  });

  return drizzle(pool, {
    schema,
    logger: false,
  });
}
