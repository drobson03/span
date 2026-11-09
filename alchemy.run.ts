import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Neon from "@alchemy.run/neon";
import * as Alchemy from "alchemy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  Hyperdrive,
  isPreviewStage,
  PRODUCTION_STAGE,
} from "./infra/database.ts";

const requireConfig = (name: string) =>
  Config.String(name).pipe(Effect.orDie);

export class Website extends Cloudflare.Website.Vite<Website>()(
  "Website",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const production = stage === PRODUCTION_STAGE;
    const preview = isPreviewStage(stage);

    // Predictable preview hostnames, so production can trust them with a
    // narrow `https://span-pr-*.<subdomain>.workers.dev` origin pattern.
    const name = preview ? `span-${stage}` : undefined;
    const previewUrl = preview
      ? `https://${name}.${yield* requireConfig("WORKERS_SUBDOMAIN")}.workers.dev`
      : undefined;

    const productionUrl = production
      ? yield* requireConfig("BETTER_AUTH_URL")
      : undefined;

    return {
      name,
      // Production is served from its own domain, in a zone on this account.
      domain: productionUrl ? new URL(productionUrl).hostname : undefined,
      env: {
        HYPERDRIVE: yield* Hyperdrive,
        BETTER_AUTH_URL:
          previewUrl ?? productionUrl ?? Config.String("BETTER_AUTH_URL"),
        // Non-production stages get their own secret, so they never hold
        // production's.
        BETTER_AUTH_SECRET: production
          ? Config.Redacted("BETTER_AUTH_SECRET")
          : (yield* Alchemy.Random("BetterAuthSecret")).text,
        // Optional: defaults are not bound, so this may be absent at runtime.
        BETTER_AUTH_TRUSTED_ORIGINS: Config.String(
          "BETTER_AUTH_TRUSTED_ORIGINS",
        ).pipe(Config.withDefault("")),
        GOOGLE_CLIENT_ID: Config.String("GOOGLE_CLIENT_ID"),
        GOOGLE_CLIENT_SECRET: Config.Redacted("GOOGLE_CLIENT_SECRET"),
        OAUTH_PROXY_PRODUCTION_URL: Config.String("OAUTH_PROXY_PRODUCTION_URL"),
        OAUTH_PROXY_SECRET: Config.Redacted("OAUTH_PROXY_SECRET"),
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
