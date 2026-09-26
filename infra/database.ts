import {
  getProjectBranch,
  listProjectBranchDatabases,
} from "@distilled.cloud/neon";
import * as Neon from "alchemy/Neon";
import * as Output from "alchemy/Output";
import type { ProviderService } from "alchemy/Provider";
import { retain } from "alchemy/RemovalPolicy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// Resolve identifiers through Neon's API at plan time, never in a Worker.
// Missing IDs, inaccessible branches, or ambiguous databases fail the plan.
const existing = Output.fromEffect(
  Effect.gen(function* () {
    const projectId = yield* Config.NonEmptyString("NEON_PROJECT_ID");
    const branchId = yield* Config.NonEmptyString("NEON_BRANCH_ID");
    const { branch } = yield* getProjectBranch({
      project_id: projectId,
      branch_id: branchId,
    });
    const { databases } = yield* listProjectBranchDatabases({
      project_id: projectId,
      branch_id: branchId,
    });
    if (databases.length !== 1) {
      return yield* Effect.die(
        new Error(
          "Expected one database on the existing Neon branch; verify its databases before adoption.",
        ),
      );
    }
    return {
      projectId,
      name: branch.name,
      protected: branch.protected,
      expiresAt: branch.expires_at,
    };
  }).pipe(Effect.orDie),
);

export const Database = Neon.Branch("Database", {
  project: { projectId: existing.projectId },
  name: existing.name,
  protected: existing.protected,
  expiresAt: existing.expiresAt,
}).pipe(retain());

// Alchemy's standard Neon provider creates a branch if read cannot find one.
// This app is adopting existing data, so creation/replacement is forbidden.
export function existingBranchOnly(
  provider: ProviderService<Neon.Branch>,
): ProviderService<Neon.Branch> {
  return {
    ...provider,
    reconcile: (input) => {
      if (!input.output) {
        return Effect.die(
          new Error(
            "The configured Neon branch must already exist; refusing to create or replace it.",
          ),
        );
      }
      if (
        input.news.name !== input.output.branchName ||
        input.news.project.projectId !== input.output.projectId
      ) {
        return Effect.die(
          new Error(
            "Refusing to retarget the adopted Neon branch. Use a separate stage for another database.",
          ),
        );
      }
      return provider.reconcile(input);
    },
    delete: () => Effect.void,
  };
}

export const databaseProviders = Layer.effect(
  Neon.Providers,
  Effect.gen(function* () {
    const collection = yield* Neon.Providers;
    const provider = collection.get<Neon.Branch>(Neon.Branch.Type)!;
    const guarded = existingBranchOnly(provider);
    return {
      kind: "ProviderCollection" as const,
      providers: { [Neon.Branch.Type]: guarded as unknown as ProviderService },
      get: <R extends import("alchemy/Resource").ResourceLike>(type: string) =>
        type === Neon.Branch.Type
          ? (guarded as unknown as ProviderService<R>)
          : undefined,
    };
  }),
).pipe(Layer.provideMerge(Neon.providers()));
