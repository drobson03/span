import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
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

  // Memoize available tags extraction separately for better performance
  const availableTags = useMemo(() => {
    if (!workouts) return [];

    const allTags = new Set<string>();
    for (const workout of workouts) {
      if (workout.tags) {
        workout.tags.forEach((tag) => allTags.add(tag));
      }
    }

    return Array.from(allTags).sort();
  }, [workouts]);

  // Memoize filtered workouts with optimized filtering logic
  const filteredWorkouts = useMemo(() => {
    if (!workouts) return [];
    if (selectedTags.length === 0) return workouts;

    // Convert selectedTags to Set for O(1) lookup
    const selectedTagsSet = new Set(selectedTags);

    return workouts.filter((workout) => {
      if (!workout.tags || workout.tags.length === 0) return false;

      // Check if workout has ALL selected tags (AND logic)
      return selectedTags.every((tag) => workout.tags!.includes(tag));
    });
  }, [workouts, selectedTags]);

  // Memoize the tags change handler to prevent unnecessary re-renders
  const handleTagsChange = useCallback((tags: string[]) => {
    setSelectedTags(tags);
  }, []);

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
          onTagsChange={handleTagsChange}
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
