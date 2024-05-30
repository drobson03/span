import { cache, createAsync } from "@solidjs/router";
import dayjs from "dayjs";
import { For, createMemo } from "solid-js";
import { twMerge } from "tailwind-merge";
import { db } from "~/server/db";
import { type Workout } from "~/server/schema";
import { getAuthenticatedUser } from "~/server/utils";

export const getWorkouts = cache(async (since: string) => {
  "use server";
  const startDate = dayjs(since, "YYYY-MM-DD").hour(0).minute(0).second(0);
  const user = await getAuthenticatedUser();
  const workouts = await db.query.workout.findMany({
    orderBy: (workouts, { desc }) => [desc(workouts.date)],
    where: (workouts, { gte, eq, and }) => {
      return and(
        eq(workouts.userId, user.id),
        gte(workouts.date, startDate.toDate()),
      );
    },
  });

  return workouts.reduce(
    (acc, workout) => {
      const date = dayjs(workout.date).format("YYYY-MM-DD");
      acc[date] = acc[date] ?? [];
      acc[date].push(workout);
      return acc;
    },
    {} as Record<string, Workout[]>,
  );
}, "workouts-heatmap");

export default function Heatmap() {
  const today = createMemo(() => dayjs());
  const yearAgo = createMemo(() => today().subtract(1, "year"));

  const workouts = createAsync(() =>
    getWorkouts(yearAgo().format("YYYY-MM-DD")),
  );

  const dates = createMemo(() => {
    const dates = [];
    let currentDate = yearAgo();

    while (currentDate.isBefore(today())) {
      dates.push(currentDate);
      currentDate = currentDate.add(1, "day");
    }

    dates.push(today());

    return dates;
  });

  return (
    <div class="flex w-auto flex-col gap-2 border p-4 md:max-w-min md:px-6">
      <h2 class="text-2xl font-semibold">Heatmap</h2>
      <div class="grid grid-flow-col grid-rows-7 gap-1 overflow-x-scroll md:overflow-x-auto">
        <For each={dates()}>
          {(date) => (
            <div
              class={twMerge(
                "size-2.5 border",
                workouts()?.[date.format("YYYY-MM-DD")]?.length && "bg-black",
                today().isSame(date, "day") && "border-black",
              )}
            />
          )}
        </For>
      </div>
    </div>
  );
}
