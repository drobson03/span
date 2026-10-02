import { readdirSync } from "node:fs";
import { createServer } from "node:http";
import {
  NodeHttpServer,
  NodeRuntime,
  NodeServices,
} from "@effect/platform-node";
import { Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";
import { makeRoutes } from "./application";
import { readConfig } from "./config";

const assetRoot = new URL("../../dist/", import.meta.url).pathname;
const assets = readdirSync(`${assetRoot}assets`);
const pages = HttpRouter.addAll([
  ...assets.map((name) =>
    HttpRouter.route(
      "GET",
      `/assets/${name}`,
      HttpServerResponse.file(`${assetRoot}assets/${name}`, {
        headers: { "cache-control": "public, max-age=31536000, immutable" },
      }),
    ),
  ),
  HttpRouter.route(
    "GET",
    "/*",
    HttpServerResponse.file(`${assetRoot}index.html`, {
      headers: { "cache-control": "no-store" },
    }),
  ),
]);
const routes = Layer.merge(makeRoutes(readConfig(process.env)), pages);
NodeRuntime.runMain(
  Layer.launch(
    HttpRouter.serve(routes, { disableLogger: true }).pipe(
      Layer.provide(
        NodeHttpServer.layer(createServer, {
          port: Number(process.env.PORT ?? 3000),
        }),
      ),
      Layer.provide(NodeServices.layer),
    ),
  ),
);
