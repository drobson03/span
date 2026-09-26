import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Output from "alchemy/Output";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { Database, databaseProviders } from "./infra/database";
import AuthApi from "./src/auth/worker";
import * as Effect from "effect/Effect";

const productionDomain = "span.darcyr.dev";

export const Website = Cloudflare.Website.Vite(
  "Website",
  Effect.gen(function* () {
    const stage = yield* Alchemy.Stage;
    return {
      domain: stage === "prod" ? productionDomain : undefined,
      compatibility: { date: "2026-09-01", flags: ["nodejs_compat"] },
      env: {
        DATABASE_URL: Output.map(
          (yield* Database).pooledConnectionUri,
          Redacted.make,
        ),
        AUTH: AuthApi,
      },
    };
  }),
);

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
  "Span",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), databaseProviders),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const database = yield* Database;
    yield* AuthApi;
    const website = yield* Website;

    return {
      databaseBranchId: database.branchId,
      websiteUrl: website.url,
    };
  }),
);
