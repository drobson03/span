import { createFileRoute } from "@tanstack/react-router";
import { add, endOfWeek } from "date-fns";
import Heatmap from "~/components/heatmap";
import { getWorkoutsByDateQueryOptions } from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/analytics")({
  loader: async ({ context }) => {
    const since = add(endOfWeek(new Date()), {
      days: 1,
      weeks: -53,
    });
    await context.queryClient.ensureQueryData(
      getWorkoutsByDateQueryOptions(since),
    );

    return { crumb: "Analytics" };
  },
  component: Analytics,
});

function Analytics() {
  return <Heatmap />;
}
