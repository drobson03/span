import { Title } from "@solidjs/meta";
import {
  A,
  type RouteDefinition,
  cache,
  createAsync,
  useParams,
} from "@solidjs/router";
import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { For, Show, createMemo } from "solid-js";
import { twMerge } from "tailwind-merge";
import ChevronLeftIcon from "~/components/icons/chevron-left";
import ChevronRightIcon from "~/components/icons/chevron-right";
import { db } from "~/server/db";
import type { Workout } from "~/server/schema";
import { chunk, getAuthenticatedUser } from "~/server/utils";

dayjs.extend(isoWeek);

const getWorkoutsByDay = cache(async (month: string) => {
  "use server";
  const monthDate = dayjs(month, "YYYY-MM").date(1);
  const user = await getAuthenticatedUser();
  const workouts = await db.query.workout.findMany({
    orderBy: (workouts, { desc }) => [desc(workouts.date)],
    where: (workouts, { and, eq, sql }) => {
      return and(
        eq(workouts.userId, user.id),
        eq(
          sql`strftime('%Y-%m', ${workouts.date}, 'unixepoch')`,
          monthDate.format("YYYY-MM"),
        ),
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
}, "workouts-by-day-by-month");

function getDatesForCalendarView(month: Dayjs) {
  let startDate = month.startOf("isoWeek");

  const endDate = startDate.add(6, "weeks");

  const dates: Dayjs[] = [];

  while (startDate.isBefore(endDate)) {
    dates.push(startDate);
    startDate = startDate.add(1, "day");
  }

  return dates;
}

export const route = {
  load: ({ params }) => getWorkoutsByDay(params.month),
} satisfies RouteDefinition;

export default function Calendar() {
  const params = useParams();

  const workouts = createAsync(() => getWorkoutsByDay(params.month));

  const month = createMemo(
    () => dayjs(params.month, "YYYY-MM").date(1) ?? dayjs().date(1),
  );
  const dates = createMemo(() => chunk(getDatesForCalendarView(month()), 7));

  return (
    <>
      <Title>Calendar</Title>
      <div class="md:flex-[80_1_0]">
        <header class="hidden flex-row items-center justify-between border-b p-4 md:flex md:px-6">
          <h1 class="font-semibold text-4xl">Calendar</h1>
          <div class="flex flex-row items-center gap-2">
            <A
              href={`/calendar/${month().subtract(1, "month").format("YYYY-MM")}`}
              class="border p-1 transition-colors hover:bg-gray-50"
            >
              <ChevronLeftIcon class="size-6" />
            </A>
            <A
              href={`/calendar/${dayjs().format("YYYY-MM")}`}
              class="w-40 border px-2 py-1 text-center transition-colors hover:bg-gray-50"
              title="Return to current month"
            >
              {month().format("MMMM YYYY")}
            </A>
            <A
              href={`/calendar/${month().add(1, "month").format("YYYY-MM")}`}
              class="border p-1 transition-colors hover:bg-gray-50"
            >
              <ChevronRightIcon class="size-6" />
            </A>
          </div>
        </header>
        <div class="flex flex-col gap-[0.0625rem] border-b bg-gray-200 md:grid md:grid-cols-7 md:place-items-stretch">
          <For each={dates()}>
            {(weekDays) => (
              <div class="gap-[0.0625rem] divide-y md:col-span-7 md:grid md:grid-cols-subgrid md:place-items-stretch md:divide-y-0">
                <For each={weekDays}>
                  {(day) => (
                    <div
                      class={twMerge(
                        "group flex items-center justify-between bg-white p-4 transition-colors hover:cursor-pointer hover:bg-gray-50 md:min-h-32 md:px-6",
                        day.isSame(dayjs(), "day") &&
                          "bg-black text-white hover:bg-black",
                        !day.isSame(month(), "month") &&
                          "text-gray-500 hover:text-black",
                      )}
                    >
                      <h2 class="font-medium text-lg">
                        {day.format("DD MMM")}
                      </h2>
                      <Show when={workouts()?.[day.format("YYYY-MM-DD")]}>
                        <span
                          class={twMerge(
                            "text-3xl transition-colors",
                            day.isSame(month(), "month")
                              ? "text-green-500"
                              : "text-green-400 group-hover:text-green-500",
                          )}
                        >
                          ✓
                        </span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </div>
    </>
  );
}
