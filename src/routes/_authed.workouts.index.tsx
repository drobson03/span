import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import WorkoutEntry from "~/components/workouts/entry";
import { getWorkoutsQueryOptions } from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/workouts/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getWorkoutsQueryOptions);
  },
  component: Workouts,
});

function Workouts() {
  const { data: workouts } = useQuery(getWorkoutsQueryOptions);

  const remainder = useMemo(
    () => 5 - ((workouts?.length ?? 0) % 5),
    [workouts],
  );

  return (
    <div className="bg-border -m-4 flex h-full grow flex-col gap-[0.0625rem] overflow-y-auto rounded-b-xl md:grid md:grid-cols-5 md:place-items-stretch">
      <div className="bg-background flex flex-row items-center justify-end p-4 md:px-6">
        <Button asChild>
          <Link to="/workouts/new">New</Link>
        </Button>
      </div>
      {workouts?.map((workout) => (
        <WorkoutEntry key={workout.id} workout={workout} />
      ))}
      {remainder > 0 ? (
        <div
          className="bg-background"
          style={{
            gridColumn: `span ${remainder} / span ${remainder}`,
          }}
        />
      ) : null}
    </div>
  );
}
