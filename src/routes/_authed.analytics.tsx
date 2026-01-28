import { createFileRoute } from "@tanstack/react-router";
import { add, endOfWeek } from "date-fns";
import ExerciseCharts from "~/components/exercise-charts";
import Heatmap from "~/components/heatmap";
import {
  getExerciseProgressionQueryOptions,
  getWorkoutsByDateQueryOptions,
} from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/analytics")({
  loader: async ({ context }) => {
    const since = add(endOfWeek(new Date()), {
      days: 1,
      weeks: -53,
    });
    await Promise.all([
      context.queryClient.ensureQueryData(getWorkoutsByDateQueryOptions(since)),
      context.queryClient.ensureQueryData(getExerciseProgressionQueryOptions()),
    ]);

    return { crumb: "Analytics" };
  },
  component: Analytics,
});

function Analytics() {
  return (
    <div className="flex flex-col gap-6">
      <Heatmap />
      <ExerciseCharts />
    </div>
  );
}
