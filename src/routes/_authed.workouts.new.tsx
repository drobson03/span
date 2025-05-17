import { createFileRoute } from "@tanstack/react-router";
import WorkoutForm from "~/components/workouts/form";
import { getExerciseTypesQueryOptions } from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/workouts/new")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getExerciseTypesQueryOptions);
  },
  component: NewWorkout,
});

function NewWorkout() {
  return (
    <div className="md:flex-[80_1_0]">
      <header className="hidden border-b p-4 md:flex md:px-6">
        <h1 className="text-4xl font-semibold">New Workout</h1>
      </header>
      <WorkoutForm />
    </div>
  );
}
