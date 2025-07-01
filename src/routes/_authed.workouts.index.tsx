import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import WorkoutEntry from "~/components/workouts/entry";
import WorkoutFilter from "~/components/workouts/filter";
import { getWorkoutsQueryOptions } from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/workouts/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getWorkoutsQueryOptions);
  },
  component: Workouts,
});

function Workouts() {
  const { data: workouts } = useQuery(getWorkoutsQueryOptions);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { filteredWorkouts, availableTags } = useMemo(() => {
    if (!workouts) return { filteredWorkouts: [], availableTags: [] };

    // Get all unique tags from workouts
    const allTags = new Set<string>();
    for (const workout of workouts) {
      if (workout.tags) {
        for (const tag of workout.tags) {
          allTags.add(tag);
        }
      }
    }

    // Filter workouts based on selected tags
    const filtered =
      selectedTags.length === 0
        ? workouts
        : workouts.filter((workout) =>
            selectedTags.every((tag) => workout.tags?.includes(tag)),
          );

    return {
      filteredWorkouts: filtered,
      availableTags: Array.from(allTags).sort(),
    };
  }, [workouts, selectedTags]);

  const remainder = useMemo(
    () => 5 - ((filteredWorkouts?.length ?? 0) % 5),
    [filteredWorkouts],
  );

  return (
    <div className="bg-border -m-4 flex h-full grow flex-col gap-[0.0625rem] overflow-y-auto rounded-b-xl md:grid md:grid-cols-5 md:place-items-stretch">
      <div className="bg-background flex flex-col gap-4 p-4 md:col-span-5 md:px-6">
        <div className="flex flex-row items-center justify-between">
          <h1 className="text-xl font-semibold">Workouts</h1>
          <Button asChild>
            <Link to="/workouts/new">New</Link>
          </Button>
        </div>
        <WorkoutFilter
          availableTags={availableTags}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />
      </div>
      {filteredWorkouts?.map((workout) => (
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
