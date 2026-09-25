import { createFileRoute } from "@tanstack/react-router";
import ActiveWorkout from "~/components/workouts/active";
import { getExerciseTypesQueryOptions } from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/workouts/active")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getExerciseTypesQueryOptions);
    return { crumb: "Active workout" };
  },
  component: ActiveWorkoutRoute,
});

function ActiveWorkoutRoute() {
  const { user } = Route.useRouteContext();
  return <ActiveWorkout key={user!.id} userId={user!.id} />;
}
