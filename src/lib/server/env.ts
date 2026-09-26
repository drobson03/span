import { minLength, object, parse, pipe, string, url } from "valibot";

const EnvSchema = object({
  BETTER_AUTH_SECRET: string(),
  OAUTH_PROXY_PRODUCTION_URL: pipe(string(), url()),
  OAUTH_PROXY_SECRET: pipe(string(), minLength(32)),
  DATABASE_URL: string(),
  GOOGLE_CLIENT_ID: string(),
  GOOGLE_CLIENT_SECRET: string(),
});

export const env = parse(EnvSchema, process.env);
