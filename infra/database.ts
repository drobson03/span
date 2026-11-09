import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Neon from "@alchemy.run/neon";
import * as Alchemy from "alchemy";
import * as RemovalPolicy from "alchemy/RemovalPolicy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

export const PRODUCTION_STAGE = "prod";

/** Stages deployed by CI for pull requests (`pr-<number>`). */
export const isPreviewStage = (stage: string) => stage.startsWith("pr-");

// drizzle-kit output (`pnpm db:generate`), applied by Alchemy on deploy.
const MIGRATIONS = "./migrations";

// Neon's free plan allows at most 6 hours of history.
const HISTORY_RETENTION_SECONDS = 6 * 60 * 60;

// Lets Neon delete preview branches whose PR was never cleaned up.
const PREVIEW_BRANCH_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Production owns the existing Neon project, adopted by name with
 * `alchemy deploy --stage prod --adopt`. Every other stage gets its own
 * copy-on-write branch of production.
 */
export const Database = Effect.gen(function* () {
  const { stage } = yield* Alchemy.Stack;

  if (stage === PRODUCTION_STAGE) {
    const project = yield* Neon.Project("Database", {
      name: yield* Config.String("NEON_PROJECT_NAME").pipe(Effect.orDie),
      historyRetentionSeconds: HISTORY_RETENTION_SECONDS,
      migrations: MIGRATIONS,
    }).pipe(RemovalPolicy.retain());

    return { origin: project.origin, pooledOrigin: project.pooledOrigin };
  }

  const project = yield* Neon.Project.ref("Database", {
    stage: PRODUCTION_STAGE,
  });
  const branch = yield* Neon.Branch("Branch", {
    project,
    migrations: MIGRATIONS,
    // Pushed forward on every deploy, so only abandoned previews expire.
    expiresAt: isPreviewStage(stage)
      ? new Date(Date.now() + PREVIEW_BRANCH_TTL_MS).toISOString()
      : undefined,
  });

  return { origin: branch.origin, pooledOrigin: branch.pooledOrigin };
});

export const Hyperdrive = Effect.gen(function* () {
  const { origin, pooledOrigin } = yield* Database;

  return yield* Cloudflare.Hyperdrive.Connection("Hyperdrive", {
    // Hyperdrive pools the direct endpoint; `alchemy dev` skips Hyperdrive
    // and connects through Neon's pooler instead.
    origin,
    dev: pooledOrigin,
    // Writes must be visible to the next read (e.g. sessions after sign-in).
    caching: { disabled: true },
  });
});
