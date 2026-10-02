import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/lib/server/db/schema/auth.ts",
    "./src/lib/server/db/schema/workouts.ts",
    "./src/server/auth-schema.ts",
  ],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
