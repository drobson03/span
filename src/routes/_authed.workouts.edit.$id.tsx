import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Spinner } from "~/components/ui/kibo-ui/spinner";
import WorkoutForm from "~/components/workouts/form";
import {
  getExerciseTypesQueryOptions,
  getWorkoutQueryOptions,
} from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/workouts/edit/$id")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      getWorkoutQueryOptions(params.id),
    );
    await context.queryClient.ensureQueryData(getExerciseTypesQueryOptions);

    return {
      crumb: "Edit",
    };
  },
  component: RouteComponent,
});

// NOTE: something very wrong with types here
function RouteComponent(): React.ReactNode {
  const { id } = Route.useParams();

  const { data: workout } = useQuery(getWorkoutQueryOptions(id));

  return workout ? <WorkoutForm workout={workout} /> : <Spinner />;
}
