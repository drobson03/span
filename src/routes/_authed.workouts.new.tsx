import { createFileRoute } from "@tanstack/react-router";
import WorkoutForm from "~/components/workouts/form";
import { getExerciseTypesQueryOptions } from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/workouts/new")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getExerciseTypesQueryOptions);

    return {
      crumb: "New",
    };
  },
  component: NewWorkout,
});

function NewWorkout() {
  return <WorkoutForm />;
}
