import { object, parse, string } from "valibot";

const EnvSchema = object({
  BETTER_AUTH_SECRET: string(),
  DATABASE_URL: string(),
  GOOGLE_CLIENT_ID: string(),
  GOOGLE_CLIENT_SECRET: string(),
});

export const env = parse(EnvSchema, process.env);
