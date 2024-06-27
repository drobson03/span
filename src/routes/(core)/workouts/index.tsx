import { Title } from "@solidjs/meta";
import { A, cache, createAsync } from "@solidjs/router";
import { Accessor, Index, createMemo, createSignal, onMount } from "solid-js";
import { db } from "~/server/db";
import type { Exercise, ExerciseType, Set, Workout } from "~/server/schema";
import { chunk, getAuthenticatedUser } from "~/server/utils";

type WorkoutWithAllInfo = Workout & {
  exercises: (Exercise & {
    exerciseType: ExerciseType;
    sets: Array<Set>;
  })[];
};

const getWorkouts = cache(async () => {
  "use server";
  const user = await getAuthenticatedUser();
  return await db.query.workout.findMany({
    orderBy: (workouts, { desc }) => [desc(workouts.date)],
    where: (workouts, { eq }) => eq(workouts.userId, user.id),
    with: {
      exercises: {
        with: {
          exerciseType: true,
          sets: true,
        },
      },
    },
  });
}, "workouts-with-exercises-sets-user");

export const route = {
  load: () => getWorkouts(),
};

export default function Workouts() {
  const workouts = createAsync(() => getWorkouts());
  const chunkedWorkouts = createMemo(() => chunk(workouts(), 5));

  return (
    <>
      <Title>Workouts</Title>
      <div class="md:flex-[80_1_0]">
        <header class="flex flex-row items-center justify-between border-b p-4 md:px-6">
          <h1 class="hidden text-4xl font-semibold md:block">Workouts</h1>
          <div class="flex flex-row items-center gap-2">
            <A
              href="/workouts/new"
              class="border px-2 py-1 text-center transition-colors hover:bg-gray-50"
            >
              New
            </A>
          </div>
        </header>
        <div class="flex flex-col divide-y md:grid md:grid-cols-5 md:place-items-stretch">
          <Index each={chunkedWorkouts()}>
            {(workouts) => (
              <div class="divide-y md:col-span-5 md:grid md:grid-cols-subgrid md:place-items-stretch md:divide-x md:divide-y-0">
                <Index each={workouts()}>
                  {(workout) => <WorkoutEntry workout={workout} />}
                </Index>
              </div>
            )}
          </Index>
        </div>
      </div>
    </>
  );
}

function WorkoutEntry({ workout }: { workout: Accessor<WorkoutWithAllInfo> }) {
  const [displayDate, setDisplayDate] = createSignal("");

  onMount(() => {
    setDisplayDate(workout().date.toLocaleString());
  });

  return (
    <div class="p-4 transition-colors hover:cursor-pointer hover:bg-gray-50 md:px-6">
      <h2 class="text-lg font-medium">{displayDate()}</h2>
      <p class="text-gray-600">{workout().notes}</p>
      <ul class="mt-2 space-y-2">
        <Index each={workout().exercises}>
          {(exercise) => (
            <li>
              <h3 class="text-xl font-semibold">
                {exercise().exerciseType.name}
              </h3>
              <p class="text-gray-600">
                {`${Intl.NumberFormat(undefined, {
                  minimumFractionDigits: 1,
                }).format(exercise().weight)} kg`}
              </p>
              <p class="text-gray-600">{exercise().notes}</p>
              <ul class="mt-2 flex flex-row space-x-2">
                <Index each={exercise().sets}>
                  {(set) => (
                    <li class="inline-flex size-10 items-center justify-center border bg-white">
                      {set().reps}
                    </li>
                  )}
                </Index>
              </ul>
            </li>
          )}
        </Index>
      </ul>
    </div>
  );
}
