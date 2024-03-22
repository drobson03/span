import { object, string, parse } from "valibot";

const EnvSchema = object({
  DATABASE_URL: string(),
  DATABASE_AUTH_TOKEN: string(),
});

export const env = parse(EnvSchema, process.env);
