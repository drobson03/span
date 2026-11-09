import { getRequest } from "@tanstack/react-start/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "~/lib/server/db/schema/relations";
import { env } from "~/lib/server/env";

function createDb() {
  return drizzle({
    client: new Pool({
      connectionString: env.HYPERDRIVE.connectionString,
      max: 5,
    }),
    relations,
    logger: import.meta.env.DEV,
  });
}

type Db = ReturnType<typeof createDb>;

// Workers can't share sockets between requests, so each request gets its own
// pool. Hyperdrive keeps the connections to Postgres warm.
const dbs = new WeakMap<Request, Db>();

function getDb() {
  const request = getRequest();
  let db = dbs.get(request);
  if (!db) {
    db = createDb();
    dbs.set(request, db);
  }
  return db;
}

export const db = new Proxy({} as Db, {
  get(_, prop) {
    return Reflect.get(getDb(), prop);
  },
});
