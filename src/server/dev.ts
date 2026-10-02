import { createServer } from "node:http";
import {
  NodeHttpServer,
  NodeRuntime,
  NodeServices,
} from "@effect/platform-node";
import { Exit, Layer } from "effect";
import { HttpRouter } from "effect/http";
import { createServer as createViteServer } from "vite";
import { makeRoutes } from "./application";
import { readConfig } from "./config";

const vite = await createViteServer();
await vite.listen();
vite.printUrls();
NodeRuntime.runMain(
  Layer.launch(
    HttpRouter.serve(makeRoutes(readConfig(process.env)), {
      disableLogger: true,
    }).pipe(
      Layer.provide(
        NodeHttpServer.layer(createServer, { host: "127.0.0.1", port: 3001 }),
      ),
      Layer.provide(NodeServices.layer),
    ),
  ),
  {
    teardown: async (exit, onExit) => {
      await vite.close();
      onExit(Exit.isSuccess(exit) ? 0 : 1);
    },
  },
);
