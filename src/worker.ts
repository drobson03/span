import { Effect } from "effect";
import { makeWebHandler } from "./server/application";
import { readConfig } from "./server/config";
import type { ServerConfig } from "./server/config";

type Env = ServerConfig & {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/api/") && !path.startsWith("/auth/")) {
      return env.ASSETS.fetch(request);
    }
    // A scoped pool per invocation follows Workers' socket ownership rules.
    const app = makeWebHandler(readConfig(env));
    return Effect.runPromise(
      Effect.acquireUseRelease(
        Effect.succeed(app),
        (resource) => Effect.promise(() => resource.handler(request)),
        (resource) => Effect.promise(() => resource.dispose()),
      ),
    );
  },
};
