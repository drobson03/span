import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import {
  type Workout,
  workout as workoutTable,
  exercise,
  set as setTable,
} from "~/server/db/schema";
import { db } from "~/server/db";
import { getUser } from "~/server/auth/functions";
import { format, set } from "date-fns";
import {
  array,
  type InferInput,
  maxLength,
  minValue,
  number,
  object,
  parse,
  pipe,
  string,
} from "valibot";

function reduceWorkoutsByDate(workouts: Workout[]) {
  return workouts.reduce(
    (acc, workout) => {
      const date = format(workout.date, "yyyy-MM-dd");
      acc[date] = acc[date] ?? [];
      acc[date].push(workout);
      return acc;
    },
    {} as Record<string, Workout[]>,
  );
}

export const getWorkoutsByDate = createServerFn("GET", async (since: Date) => {
  const startDate = set(since, {
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const { user } = await getUser();

  if (!user) {
    return {};
  }

  return reduceWorkoutsByDate(
    await db.query.workout.findMany({
      orderBy: (workouts, { desc }) => [desc(workouts.date)],
      where: (workouts, { gte, eq, and }) => {
        return and(eq(workouts.userId, user.id), gte(workouts.date, startDate));
      },
    }),
  );
});

export const getWorkoutsByDateQueryOptions = (since: Date) =>
  queryOptions({
    queryKey: ["workouts", since],
    queryFn: async () => await getWorkoutsByDate(since),
  });

export const getWorkoutsByDateForMonth = createServerFn(
  "GET",
  async (month: Date) => {
    const monthDate = set(month, { date: 1 });
    const { user } = await getUser();

    if (!user) {
      return {};
    }

    return reduceWorkoutsByDate(
      await db.query.workout.findMany({
        orderBy: (workouts, { desc }) => [desc(workouts.date)],
        where: (workouts, { and, eq, sql }) => {
          return and(
            eq(workouts.userId, user.id),
            eq(
              sql`strftime('%Y-%m', ${workouts.date}, 'unixepoch')`,
              format(monthDate, "yyyy-MM"),
            ),
          );
        },
      }),
    );
  },
);

export const getWorkoutsByDateForMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: ["workouts", month],
    queryFn: async () => await getWorkoutsByDateForMonth(month),
  });

export const getWorkouts = createServerFn("GET", async () => {
  const { user } = await getUser();

  if (!user) {
    return [];
  }

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
});

export const getWorkoutsQueryOptions = queryOptions({
  queryKey: ["workouts"],
  queryFn: async () => await getWorkouts(),
});

export const getExerciseTypes = createServerFn("GET", async () => {
  return await db.query.exerciseType.findMany();
});

export const getExerciseTypesQueryOptions = queryOptions({
  queryKey: ["exercise-types"],
  queryFn: async () => await getExerciseTypes(),
});

const WorkoutFormDataSchema = object({
  datetime: string(),
  notes: pipe(string(), maxLength(1000)),
  exercises: array(
    object({
      exerciseTypeId: string(),
      weight: string(),
      targetReps: pipe(number(), minValue(0)),
      notes: pipe(string(), maxLength(1000)),
      sets: array(pipe(number(), minValue(0))),
    }),
  ),
});

export type WorkoutFormData = Omit<
  InferInput<typeof WorkoutFormDataSchema>,
  "datetime"
> & {
  datetime: string;
};

export const createWorkout = createServerFn(
  "POST",
  async (w: WorkoutFormData) => {
    const workout = parse(WorkoutFormDataSchema, w);

    const { user } = await getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const results = await db
      .insert(workoutTable)
      .values({
        userId: user.id,
        date: new Date(workout.datetime),
        notes: workout.notes.length > 0 ? workout.notes : null,
      })
      .returning({ workoutId: workoutTable.id });

    if (results.length === 0) {
      throw new Error("Failed to create workout");
    }

    const { workoutId } = results[0]!;

    if (workout.exercises.length === 0) {
      return;
    }

    const exercises = await db
      .insert(exercise)
      .values(
        workout.exercises.map((exercise) => ({
          workoutId,
          exerciseTypeId: exercise.exerciseTypeId,
          weight: Number.parseFloat(exercise.weight),
          targetReps: exercise.targetReps,
          notes: exercise.notes.length > 0 ? exercise.notes : null,
          sets: exercise.sets,
        })),
      )
      .returning({ id: exercise.id });

    if (exercises.length === 0) {
      return;
    }

    await db
      .insert(setTable)
      .values(
        workout.exercises.flatMap((exercise, i) =>
          exercise.sets.map((reps) => ({
            exerciseId: exercises[i]!.id,
            reps,
          })),
        ),
      )
      .returning({ id: setTable.id });

    return;
  },
);
