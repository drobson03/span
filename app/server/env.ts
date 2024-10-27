import { url, object, parse, pipe, string } from "valibot";

const EnvSchema = object({
  DATABASE_URL: string(),
  DATABASE_AUTH_TOKEN: string(),
  GOOGLE_CLIENT_ID: string(),
  GOOGLE_CLIENT_SECRET: string(),
  GOOGLE_REDIRECT_URI: pipe(string(), url()),
});

export const env = parse(EnvSchema, process.env);
