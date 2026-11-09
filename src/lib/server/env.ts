import * as cf from "cloudflare:workers";
import type { WebsiteEnv } from "../../../alchemy.run.ts";

// TanStack Start's dev server evaluates modules outside the Worker request
// context, so defer reading `cloudflare:workers` until a property is accessed.
export const env = new Proxy({} as WebsiteEnv, {
  get(_, prop) {
    return cf.env[prop as keyof typeof cf.env];
  },
});
