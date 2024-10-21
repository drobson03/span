import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useMemo } from "react";
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

  const kgFormatter = Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
  });

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
          <div
            key={workout.id}
            className="bg-white p-4 transition-colors md:px-6"
          >
            <h2 className="text-lg font-medium">
              {format(workout.date as Date, "dd/MM/yyyy, h:mm aaa")}
            </h2>
            <p className="text-gray-600">{workout.notes}</p>
            <ul className="mt-2 space-y-2">
              {workout.exercises.map((exercise) => (
                <li key={exercise.id}>
                  <h3 className="text-xl font-semibold">
                    {exercise.exerciseType.name}
                  </h3>
                  <p className="text-gray-600">
                    {`${kgFormatter.format(exercise.weight)} kg`}
                  </p>
                  <p className="text-gray-600">{exercise.notes}</p>
                  <ul className="mt-2 flex flex-row space-x-2">
                    {exercise.sets.map((set) => (
                      <li
                        key={set.id}
                        className="inline-flex size-10 items-center justify-center border bg-white"
                      >
                        {set.reps}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
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
