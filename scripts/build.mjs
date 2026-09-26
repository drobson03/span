import { mkdir, writeFile } from "node:fs/promises";
import { createBuilder } from "vite";
import cloudflare from "@alchemy.run/cloudflare-runtime/vite";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
// This build-only API is internal to the pinned Alchemy version.
const { WorkerBundle } = await import(
  new URL(
    "./Cloudflare/Workers/Sources/Rolldown.js",
    import.meta.resolve("alchemy"),
  )
);

// Offline validation uses the same Vite plugin and Effect Worker bundler as
// Alchemy deploy. No stack evaluation, profiles, resource plans, or cloud calls.
const builder = await createBuilder(
  {
    plugins: [
      cloudflare({
        compatibilityDate: "2026-09-01",
        compatibilityFlags: ["nodejs_compat"],
      }),
    ],
  },
  null,
);
await builder.buildApp();

const bundle = await Effect.runPromise(
  Effect.gen(function* () {
    const bundler = yield* WorkerBundle;
    return yield* bundler.build({
      id: "AuthApi",
      main: "./src/auth/worker.ts",
      compatibility: { date: "2026-09-01", flags: ["nodejs_compat"] },
      entry: { kind: "effect", exports: {} },
      stack: { name: "Span", stage: "smoke" },
      extraOptions: { output: { dir: "dist/auth" } },
    });
  }).pipe(Effect.provide(NodeServices.layer)),
);
await mkdir("dist", { recursive: true });
await writeFile("dist/auth-entry.json", JSON.stringify(bundle.files[0].path));
