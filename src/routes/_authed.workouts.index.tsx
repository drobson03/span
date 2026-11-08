import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/kibo-ui/spinner";
import WorkoutEntry from "~/components/workouts/entry";
import WorkoutFilter from "~/components/workouts/filter";
import {
  getWorkoutsInfiniteQueryOptions,
  getWorkoutTagsQueryOptions,
} from "~/lib/server/functions";

export const Route = createFileRoute("/_authed/workouts/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        getWorkoutsInfiniteQueryOptions(),
      ),
      context.queryClient.ensureQueryData(getWorkoutTagsQueryOptions),
    ]);
  },
  component: Workouts,
});

function Workouts() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { data: availableTags = [] } = useQuery(getWorkoutTagsQueryOptions);
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...getWorkoutsInfiniteQueryOptions(selectedTags),
      placeholderData: keepPreviousData,
    });

  const workouts = useMemo(
    () => data?.pages.flatMap((page) => page.workouts) ?? [],
    [data],
  );

  const handleTagsChange = useCallback((tags: string[]) => {
    // Sort so the same selection always maps to the same query key
    setSelectedTags([...tags].sort());
  }, []);

  // Load the next page when the sentinel scrolls into view
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        fetchNextPage();
      }
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const remainder = 5 - (workouts.length % 5);

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
      {workouts.map((workout) => (
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
      {hasNextPage ? (
        <div
          ref={sentinelRef}
          className="bg-background flex justify-center p-4 md:col-span-5"
        >
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? <Spinner className="size-4" /> : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
