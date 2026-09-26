import { createFileRoute } from "@tanstack/react-router";
import { getEnv } from "~/lib/server/env";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => {
        return getEnv().AUTH.fetch(request);
      },
      POST: ({ request }) => {
        return getEnv().AUTH.fetch(request);
      },
    },
  },
});
