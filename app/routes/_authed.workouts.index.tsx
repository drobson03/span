import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import WorkoutEntry from "~/components/workouts/entry";
import { getWorkoutsQueryOptions } from "~/server/functions";

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
    <div className="md:flex-[80_1_0]">
      <header className="flex flex-row items-center justify-between border-b p-4 md:px-6">
        <h1 className="hidden text-4xl font-semibold md:block">Workouts</h1>
        <div className="flex flex-row items-center gap-2">
          <Link
            to="/workouts/new"
            className="border px-2 py-1 text-center transition-colors hover:bg-gray-50"
          >
            New
          </Link>
        </div>
      </header>
      <div className="flex h-full flex-grow flex-col gap-[0.0625rem] overflow-y-auto bg-gray-200 md:grid md:grid-cols-5 md:place-items-stretch">
        {workouts?.map((workout) => (
          <WorkoutEntry key={workout.id} workout={workout} />
        ))}
        {remainder > 0 ? (
          <div
            className="bg-white"
            style={{
              gridColumn: `span ${remainder} / span ${remainder}`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
