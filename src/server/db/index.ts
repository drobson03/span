import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "~/server/db/schema";
import { env } from "~/server/env";

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
