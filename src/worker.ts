import { makeWebHandler } from "./server/application";
import { readConfig, type ServerConfig } from "./server/config";

type Env = ServerConfig & {
  ASSETS: { fetch(request: Request): Promise<Response> };
};
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/api/") && !path.startsWith("/auth/"))
      return env.ASSETS.fetch(request);
    // A scoped pool per invocation follows Workers' socket ownership rules.
    const app = makeWebHandler(readConfig(env));
    try {
      return await app.handler(request);
    } finally {
      await app.dispose();
    }
  },
};
