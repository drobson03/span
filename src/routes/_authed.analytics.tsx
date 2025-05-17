import { createFileRoute } from "@tanstack/react-router";
import { add, endOfWeek, } from "date-fns";
import Heatmap from "~/components/heatmap";
import { getWorkoutsByDateQueryOptions } from "~/server/functions";

export const Route = createFileRoute("/_authed/analytics")({
  loader: async ({ context }) => {
    const since = add(endOfWeek(new Date()), {
      days: 1,
      weeks: -53,
    });
    await context.queryClient.ensureQueryData(
      getWorkoutsByDateQueryOptions(since),
    );
  },
  component: Analytics,
});

function Analytics() {
  return (
    <div className="md:flex-[80_1_0]">
      <header className="hidden flex-row items-center justify-between border-b p-4 md:flex md:px-6">
        <h1 className="text-4xl font-semibold">Analytics</h1>
      </header>
      <div className="p-4 md:px-6">
        <Heatmap />
      </div>
    </div>
  );
}
