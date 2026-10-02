import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Config, Effect } from "effect";

export const Website = Cloudflare.Website.Foldkit(
  "Span",
  Effect.gen(function* () {
    return {
      main: "src/worker.ts",
      compatibility: { flags: ["nodejs_compat"] },
      assets: {
        runWorkerFirst: ["/api/*", "/auth/*"],
        notFoundHandling: "single-page-application" as const,
      },
      env: {
        DATABASE_URL: yield* Config.Redacted("DATABASE_URL"),
        AUTH_ORIGIN: yield* Config.String("AUTH_ORIGIN"),
        AUTH_BINDING_SECRET: yield* Config.Redacted("AUTH_BINDING_SECRET"),
        AUTH_TRANSACTION_SECRET: yield* Config.Redacted(
          "AUTH_TRANSACTION_SECRET",
        ),
        GOOGLE_CLIENT_ID: yield* Config.String("GOOGLE_CLIENT_ID"),
        GOOGLE_CLIENT_SECRET: yield* Config.Redacted("GOOGLE_CLIENT_SECRET"),
      },
      dev: { host: "127.0.0.1", port: 3000, strictPort: true },
    };
  }).pipe(
    // Alchemy's resource input requires an infallible Effect. Missing deployment
    // configuration terminates the CLI here, before provisioning any resource.
    // oxlint-disable-next-line executor/no-effect-escape-hatch
    Effect.orDie,
  ),
);
export default Alchemy.Stack(
  "Span",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const site = yield* Website;
    return { url: site.url };
  }),
);
