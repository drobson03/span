import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "~/server/env";
import * as schema from "~/server/db/schema";

export const db = drizzle(
  createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  }),
  {
    schema,
    logger: process.env.NODE_ENV !== "production",
  },
);
