import type { Config } from "drizzle-kit";
import { existsSync } from "node:fs";

// Database tooling runs in Node, separately from the Worker's runtime bindings.
if (existsSync(".env")) process.loadEnvFile();

export default {
  schema: "./src/lib/server/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
