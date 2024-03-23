import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { remember } from "@epic-web/remember";
import { env } from "~/server/env";
import * as schema from "~/server/schema";

export const db = remember("drizzle", () => {
  const client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });

  return drizzle(client, { schema });
});
