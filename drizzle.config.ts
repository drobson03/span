import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/server/db/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
});
