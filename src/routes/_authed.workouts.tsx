import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/workouts")({
  loader: () => {
    return {
      crumb: "Workouts",
    };
  },
});
