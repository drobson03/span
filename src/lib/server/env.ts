import * as cloudflare from "cloudflare:workers";
import type { WebsiteEnv } from "../../../alchemy.run";

// Called inside requests, after the Worker bindings are available.
export function getEnv(): WebsiteEnv {
  return cloudflare.env as WebsiteEnv;
}
