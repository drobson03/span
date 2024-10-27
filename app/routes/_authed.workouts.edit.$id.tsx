import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import Spinner from "~/components/spinner";
import WorkoutForm from "~/components/workouts/form";
import {
  getExerciseTypesQueryOptions,
  getWorkoutQueryOptions,
} from "~/server/functions";

export const Route = createFileRoute("/_authed/workouts/edit/$id")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      getWorkoutQueryOptions(params.id),
    );
    await context.queryClient.ensureQueryData(getExerciseTypesQueryOptions);
  },
  component: EditWorkout,
});

function EditWorkout() {
  const { id } = Route.useParams();

  const { data: workout } = useQuery(getWorkoutQueryOptions(id));

  return (
    <div className="md:flex-[80_1_0]">
      <header className="hidden border-b p-4 md:flex md:px-6">
        <h1 className="text-4xl font-semibold">Edit Workout</h1>
      </header>
      {workout ? <WorkoutForm workout={workout} /> : <Spinner />}
    </div>
  );
}
