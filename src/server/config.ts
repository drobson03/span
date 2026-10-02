import { Schema } from "effect";

const Secret = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/),
);
export const ServerConfig = Schema.Struct({
  DATABASE_URL: Schema.NonEmptyString,
  AUTH_ORIGIN: Schema.String.check(
    Schema.makeFilter((s) => {
      const u = URL.parse(s);
      if (!u) {
        return false;
      }
      return (
        u.origin === s &&
        (u.protocol === "https:" ||
          (u.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(u.hostname)))
      );
    }),
  ),
  AUTH_BINDING_SECRET: Secret,
  AUTH_TRANSACTION_SECRET: Secret,
  GOOGLE_CLIENT_ID: Schema.NonEmptyString,
  GOOGLE_CLIENT_SECRET: Schema.NonEmptyString,
});
export type ServerConfig = typeof ServerConfig.Type;
export const readConfig = Schema.decodeUnknownSync(ServerConfig);
