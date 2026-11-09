import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Neon from "@alchemy.run/neon";
import * as Alchemy from "alchemy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Hyperdrive, PRODUCTION_STAGE } from "./infra/database.ts";

// A Cloudflare zone on this account. Production is `span.darcyr.dev`; every
// other deployed stage is `span-<stage>.darcyr.dev`, e.g. `span-pr-12`.
const ZONE = "darcyr.dev";
const PRODUCTION_URL = `https://span.${ZONE}`;

// Matches the `vite` dev server port.
const LOCAL_URL = "http://localhost:3000";

// `alchemy dev` runs in `dev_$USER` stages, served from `LOCAL_URL`.
const isLocalStage = (stage: string) => stage.startsWith("dev_");

const stageHostname = (stage: string) =>
  stage === PRODUCTION_STAGE
    ? new URL(PRODUCTION_URL).hostname
    : `span-${stage.toLowerCase().replaceAll(/[^a-z0-9-]/g, "-")}.${ZONE}`;

export class Website extends Cloudflare.Website.Vite<Website>()(
  "Website",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const production = stage === PRODUCTION_STAGE;
    const hostname = isLocalStage(stage) ? undefined : stageHostname(stage);

    // Shared by every stage: the OAuth proxy decrypts what production sends.
    const oauthProxySecret = production
      ? yield* Alchemy.Random("OAuthProxySecret")
      : yield* Alchemy.Random.ref("OAuthProxySecret", {
          stage: PRODUCTION_STAGE,
        });

    return {
      domain: hostname,
      env: {
        HYPERDRIVE: yield* Hyperdrive,
        BETTER_AUTH_URL: hostname ? `https://${hostname}` : LOCAL_URL,
        // Per stage, so no other stage can forge production's sessions.
        BETTER_AUTH_SECRET: (yield* Alchemy.Random("BetterAuthSecret")).text,
        // Only used by production, which receives every OAuth callback and
        // hands sign-ins back to local and preview origins.
        BETTER_AUTH_TRUSTED_ORIGINS: `${LOCAL_URL},https://span-*.${ZONE}`,
        GOOGLE_CLIENT_ID: Config.String("GOOGLE_CLIENT_ID"),
        GOOGLE_CLIENT_SECRET: Config.Redacted("GOOGLE_CLIENT_SECRET"),
        OAUTH_PROXY_PRODUCTION_URL: PRODUCTION_URL,
        OAUTH_PROXY_SECRET: oauthProxySecret.text,
      },
    };
  }),
) {}

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
  "Span",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), Neon.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const hyperdrive = yield* Hyperdrive;
    const website = yield* Website;

    return {
      websiteUrl: website.url.as<string>(),
      hyperdriveId: hyperdrive.hyperdriveId,
    };
  }),
);
