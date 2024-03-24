import { Title } from "@solidjs/meta";
import { cache, createAsync } from "@solidjs/router";
import { For, createMemo } from "solid-js";
import { db } from "~/server/db";
import { chunk, getAuthenticatedUser } from "~/server/utils";

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
        <header class="hidden border-b p-4 md:block md:px-6">
          <h1 class="text-4xl font-semibold">Workouts</h1>
        </header>
        <div class="flex flex-col divide-y md:grid md:grid-cols-5 md:place-items-stretch">
          <For each={chunkedWorkouts()}>
            {(workouts) => (
              <div class="divide-y md:col-span-5 md:grid md:grid-cols-subgrid md:place-items-stretch md:divide-x md:divide-y-0">
                <For each={workouts}>
                  {(workout) => (
                    <div class="p-4 transition-colors hover:cursor-pointer hover:bg-gray-50 md:px-6">
                      <h2 class="text-lg font-medium">
                        {workout.date.toLocaleString()}
                      </h2>
                      <p class="text-gray-600">{workout.notes}</p>
                      <ul class="mt-2 space-y-2">
                        <For each={workout.exercises}>
                          {(exercise) => (
                            <li>
                              <h3 class="text-xl font-semibold">
                                {exercise.exerciseType.name}
                              </h3>
                              <p class="text-gray-600">
                                {`${Intl.NumberFormat(undefined, {
                                  minimumFractionDigits: 1,
                                }).format(exercise.weight)} kg`}
                              </p>
                              <p class="text-gray-600">{exercise.notes}</p>
                              <ul class="mt-2 flex flex-row space-x-2">
                                {exercise.sets
                                  .map((set) => set.reps)
                                  .join(", ")}
                              </ul>
                            </li>
                          )}
                        </For>
                      </ul>
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
