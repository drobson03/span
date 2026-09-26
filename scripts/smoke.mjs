import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Runtime, layerRuntime } from "@alchemy.run/cloudflare-runtime/core";
import { Service, Text } from "@alchemy.run/cloudflare-runtime/core/bindings";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
const { Credentials } = await import(
  new URL("./Cloudflare/Credentials.js", import.meta.resolve("alchemy"))
);
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { defaultTeardown } from "effect/Runtime";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

async function modules(directory, entry) {
  const files = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  const result = await Promise.all(
    files
      .filter((f) => f.isFile() && /\.(m?js)$/.test(f.name))
      .map(async (f) => {
        const file = path.join(f.parentPath, f.name);
        return {
          name: path.relative(directory, file).replaceAll("\\", "/"),
          type: "ESModule",
          content: await readFile(file, "utf8"),
        };
      }),
  );
  const index = result.findIndex((m) => m.name === entry);
  assert.ok(index >= 0, `built entry ${entry} exists`);
  return [result[index], ...result.filter((_, i) => i !== index)];
}

const origin = "http://localhost:4173";
const databaseUrl =
  "postgresql://test:test@example.invalid/span?sslmode=require";
const secret = "smoke-test-only-secret-0000000000000000";
const proxySecret = crypto.randomUUID();
const authModules = await modules(
  path.resolve("dist/auth"),
  JSON.parse(await readFile("dist/auth-entry.json", "utf8")),
);
const websiteModules = await modules(path.resolve("dist/server"), "server.js");
const services = layerRuntime({ api: { accountId: "smoke-no-cloud" } }).pipe(
  Layer.provide(NodeServices.layer),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(
    Layer.succeed(
      Credentials,
      Effect.die("Cloud APIs are disabled in smoke tests"),
    ),
  ),
);

NodeRuntime.runMain(
  Effect.gen(function* () {
    const runtime = yield* Runtime;
    const common = {
      compatibilityDate: "2026-09-01",
      compatibilityFlags: ["nodejs_compat"],
      proxySharedSecret: proxySecret,
    };
    yield* runtime.start({
      ...common,
      name: "span-auth-smoke",
      modules: authModules,
      bindings: Object.entries({
        AUTH_DATABASE_URL: JSON.stringify({
          _tag: "Redacted",
          value: databaseUrl,
        }),
        BETTER_AUTH_URL: origin,
        BETTER_AUTH_SECRET: secret,
        BETTER_AUTH_TRUSTED_ORIGINS: origin,
        GOOGLE_CLIENT_ID: "smoke-client",
        GOOGLE_CLIENT_SECRET: "smoke-google-secret",
        OAUTH_PROXY_SECRET: secret,
      }).map(([name, value]) => Text.local(name, value)),
    });
    const address = yield* runtime.start({
      ...common,
      name: "span-website-smoke",
      modules: websiteModules,
      assets: { directory: path.resolve("dist/client") },
      bindings: [
        Text.local("DATABASE_URL", databaseUrl),
        Service.local({ binding: "AUTH", scriptName: "span-auth-smoke" }),
      ],
    });

    yield* Effect.promise(async () => {
      const request = (pathname, options = {}) =>
        fetch(new URL(pathname, address), {
          ...options,
          headers: {
            "Alchemy-Runtime-Proxy-Shared-Secret": proxySecret,
            "Alchemy-Runtime-Original-URL": `${origin}${pathname}`,
            ...options.headers,
          },
        });
      const login = await request("/login");
      assert.equal(login.status, 200, "login SSR");
      const html = await login.text();
      assert.match(html, /Login with Google/);
      const asset = html.match(/(?:src|href)="(\/assets\/[^" ]+)"/)?.[1];
      assert.ok(asset);
      const assetResponse = await request(asset);
      assert.equal(assetResponse.status, 200, "static asset");
      await assetResponse.arrayBuffer();
      const session = await request("/api/auth/get-session");
      assert.equal(session.status, 200, "native auth service via binding");
      assert.equal(await session.json(), null, "anonymous session");
      const signOut = await request("/api/auth/sign-out", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: "{}",
      });
      assert.equal(signOut.status, 200, "auth POST through service binding");
      assert.ok(
        signOut.headers.getSetCookie().length > 0,
        "auth cookies forwarded",
      );
      await signOut.arrayBuffer();
      const protectedPage = await request("/workouts", { redirect: "manual" });
      assert.ok(
        [302, 303, 307].includes(protectedPage.status),
        "RPC session check redirects anonymous user",
      );
      assert.equal(
        new URL(protectedPage.headers.get("location"), origin).pathname,
        "/login",
      );
      await protectedPage.arrayBuffer();
      console.log(
        "Native Worker smoke checks passed: TanStack SSR, assets, Better Auth HTTP binding, session RPC, protected routes.",
      );
    });
  }).pipe(Effect.scoped, Effect.provide(services)),
  {
    // Finalizers run before teardown. Exit this one-shot CLI even if the
    // runtime package leaves background handles alive after its scope closes.
    teardown: (exit) => defaultTeardown(exit, (code) => process.exit(code)),
  },
);
