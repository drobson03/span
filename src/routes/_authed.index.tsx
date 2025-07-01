import { createFileRoute } from "@tanstack/react-router";
import { add, endOfWeek } from "date-fns";
import Heatmap from "~/components/heatmap";
import { getWorkoutsByDateQueryOptions } from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/")({
  loader: async ({ context }) => {
    const since = add(endOfWeek(new Date()), {
      days: 1,
      weeks: -53,
    });
    await context.queryClient.ensureQueryData(
      getWorkoutsByDateQueryOptions(since),
    );

    return {
      crumb: "Dashboard",
    };
  },
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="flex flex-col gap-4">
      <Heatmap />
    </div>
  );
}
