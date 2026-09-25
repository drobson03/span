import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useState } from "react";
import * as v from "valibot";
import { Button } from "~/components/ui/button";
import WorkoutForm from "~/components/workouts/form";
import {
  getExerciseTypesQueryOptions,
  getWorkout,
} from "~/lib/server/functions";
import {
  deleteRoutine,
  getLastWorkout,
  getRoutinesQueryOptions,
} from "~/lib/server/routines";
import {
  toWorkoutTemplate,
  type WorkoutTemplate,
} from "~/lib/workout-template";

export const Route = createFileRoute("/_authed/workouts/new")({
  validateSearch: v.object({ repeat: v.optional(v.string()) }),
  loaderDeps: ({ search }) => ({ repeat: search.repeat }),
  loader: async ({ context, deps }) => {
    const [, , source] = await Promise.all([
      context.queryClient.ensureQueryData(getExerciseTypesQueryOptions),
      context.queryClient.ensureQueryData(getRoutinesQueryOptions),
      deps.repeat
        ? getWorkout({ data: { id: deps.repeat } })
        : getLastWorkout(),
    ]);
    return { crumb: "New", source, repeat: deps.repeat };
  },
  component: NewWorkout,
});

function NewWorkout() {
  const data = Route.useLoaderData();
  return <WorkoutStart key={data.repeat ?? "new"} {...data} />;
}

function WorkoutStart({
  source,
  repeat,
}: Pick<ReturnType<typeof Route.useLoaderData>, "source" | "repeat">) {
  const queryClient = useQueryClient();
  const { data: routines = [] } = useQuery(getRoutinesQueryOptions);
  const [selection, setSelection] = useState<{
    name: string;
    template?: WorkoutTemplate;
  } | null>(() =>
    repeat && source
      ? {
          name: "Repeat workout",
          template: toWorkoutTemplate({ ...source, notes: "" }),
        }
      : null,
  );
  const remove = useMutation({
    mutationFn: (id: string) => deleteRoutine({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routines"] }),
  });

  if (repeat && !source)
    return (
      <div className="space-y-4 p-4">
        <p role="alert">Workout not found.</p>
        <Link to="/workouts/new" search={{}}>
          Start a new workout
        </Link>
      </div>
    );

  if (selection)
    return (
      <>
        <div className="space-y-1 border-b p-4 md:px-6">
          <h1 className="text-xl font-semibold">{selection.name}</h1>
          {selection.template && (
            <p className="text-muted-foreground text-sm">
              Targets are prefilled. Adjust your sets to match today’s results
              before saving.
            </p>
          )}
        </div>
        <WorkoutForm template={selection.template} />
      </>
    );

  return (
    <div className="space-y-6 p-4 md:px-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Start a workout</h1>
        <p className="text-muted-foreground">
          Repeat a session, choose a saved routine, or start fresh.
        </p>
        <div className="flex flex-wrap gap-2">
          {source && (
            <Button
              onClick={() =>
                setSelection({
                  name: "Repeat last session",
                  template: toWorkoutTemplate({ ...source, notes: "" }),
                })
              }
            >
              Repeat last session · {format(source.date, "d MMM")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setSelection({ name: "New workout" })}
          >
            Start from scratch
          </Button>
        </div>
        {!source && (
          <p className="text-muted-foreground text-sm">
            Your last session will appear here after you log a workout.
          </p>
        )}
      </div>
      <section className="space-y-3" aria-labelledby="routines-heading">
        <h2 id="routines-heading" className="text-lg font-medium">
          Saved routines
        </h2>
        {routines.length === 0 && (
          <p className="text-muted-foreground">
            No routines yet. Use “Save as routine” in a new or existing workout
            to create one, like Push A.
          </p>
        )}
        {remove.isError && (
          <p role="alert" className="text-destructive">
            Could not delete routine. Please try again.
          </p>
        )}
        {routines.map((routine) => (
          <div
            key={routine.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
          >
            <div>
              <h3 className="font-medium">{routine.name}</h3>
              <p className="text-muted-foreground text-sm">
                {routine.template.exercises.length} exercises ·{" "}
                {routine.template.exercises.reduce(
                  (total, ex) => total + ex.sets.length,
                  0,
                )}{" "}
                sets
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  setSelection({
                    name: routine.name,
                    template: toWorkoutTemplate(routine.template),
                  })
                }
                aria-label={`Start ${routine.name}`}
              >
                Start routine
              </Button>
              <Button
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Delete routine “${routine.name}”?`))
                    remove.mutate(routine.id);
                }}
                aria-label={`Delete ${routine.name}`}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
