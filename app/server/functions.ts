import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { format, set } from "date-fns";
import { and, eq } from "drizzle-orm";
import {
  type InferInput,
  array,
  date,
  literal,
  maxLength,
  minValue,
  number,
  object,
  optional,
  pipe,
  string,
  variant,
} from "valibot";
import { getUser } from "~/server/auth/functions";
import { db } from "~/server/db";
import {
  type Workout,
  type WorkoutWithRelations,
  exercise,
  set as setTable,
  workout as workoutTable,
} from "~/server/db/schema";

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

export const getWorkoutsByDate = createServerFn({ method: "GET" })
  .validator(object({ since: date() }))
  .handler(async (ctx) => {
    const startDate = set(ctx.data.since, {
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
          return and(
            eq(workouts.userId, user.id),
            gte(workouts.date, startDate),
          );
        },
      }),
    );
  });

export const getWorkoutsByDateQueryOptions = (since: Date) =>
  queryOptions({
    queryKey: ["workouts", since],
    queryFn: async () => await getWorkoutsByDate({ data: { since } }),
  });

export const getWorkoutsByDateForMonth = createServerFn({
  method: "GET",
})
  .validator(object({ month: date() }))
  .handler(async (ctx) => {
    const monthDate = set(ctx.data.month, { date: 1 });
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
  });

export const getWorkoutsByDateForMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: ["workouts", month],
    queryFn: async () => await getWorkoutsByDateForMonth({ data: { month } }),
  });

async function getWorkoutsFn() {
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
}

export const getWorkouts = createServerFn({ method: "GET" }).handler(
  getWorkoutsFn,
);

export const getWorkoutsQueryOptions = queryOptions({
  queryKey: ["workouts"],
  queryFn: async () =>
    (await getWorkouts()) as Awaited<ReturnType<typeof getWorkoutsFn>>,
});

export const getExerciseTypes = createServerFn({ method: "GET" }).handler(
  async () => {
    return await db.query.exerciseType.findMany();
  },
);

export const getExerciseTypesQueryOptions = queryOptions({
  queryKey: ["exercise-types"],
  queryFn: async () => await getExerciseTypes(),
});

const WorkoutFormExerciseSchema = object({
  exerciseTypeId: string(),
  weight: string(),
  targetReps: pipe(number(), minValue(0)),
  notes: pipe(string(), maxLength(1000)),
  sets: array(object({ reps: pipe(number(), minValue(0)) })),
});

const WorkoutFormCreateWorkoutDataSchema = object({
  action: literal("create"),
  datetime: string(),
  notes: pipe(string(), maxLength(1000)),
  exercises: array(WorkoutFormExerciseSchema),
});

const WorkoutFormEditWorkoutDataSchema = object({
  ...WorkoutFormCreateWorkoutDataSchema.entries,
  action: literal("edit"),
  id: string(),
  exercises: array(
    object({
      ...WorkoutFormExerciseSchema.entries,
      id: optional(string()),
    }),
  ),
});

const WorkoutFormDataSchema = variant("action", [
  WorkoutFormCreateWorkoutDataSchema,
  WorkoutFormEditWorkoutDataSchema,
]);

export type WorkoutFormData = InferInput<typeof WorkoutFormDataSchema>;

export const createWorkout = createServerFn({ method: "POST" })
  .validator(WorkoutFormDataSchema)
  .handler(async (ctx) => {
    const workout = ctx.data;

    if (workout.action !== "create") {
      throw new Error("Invalid action");
    }

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
          exercise.sets.map((set) => ({
            ...set,
            exerciseId: exercises[i]!.id,
          })),
        ),
      )
      .returning({ id: setTable.id });
  });

export const updateWorkout = createServerFn({ method: "POST" })
  .validator(WorkoutFormEditWorkoutDataSchema)
  .handler(async (ctx) => {
    const workout = ctx.data;

    if (workout.action !== "edit") {
      throw new Error("Invalid action");
    }

    const { user } = await getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const exists = await db.query.workout.findFirst({
      where: (workouts, { eq, and }) =>
        and(eq(workouts.id, workout.id), eq(workouts.userId, user.id)),
    });

    if (!exists) {
      throw new Error("Workout not found");
    }

    await db
      .update(workoutTable)
      .set({
        notes: workout.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(workoutTable.id, workout.id));

    await db.delete(exercise).where(eq(exercise.workoutId, workout.id));

    if (workout.exercises.length > 0) {
      const exercises = await db
        .insert(exercise)
        .values(
          workout.exercises.map((ex) => ({
            workoutId: workout.id,
            exerciseTypeId: ex.exerciseTypeId,
            weight: Number.parseFloat(ex.weight),
            targetReps: ex.targetReps,
            notes: ex.notes || null,
          })),
        )
        .returning({ id: exercise.id });

      await db.insert(setTable).values(
        workout.exercises.flatMap((ex, i) =>
          ex.sets.map((set) => ({
            exerciseId: exercises[i]!.id,
            reps: set.reps,
          })),
        ),
      );
    }
  });

export const deleteWorkout = createServerFn({ method: "POST" })
  .validator(object({ id: string() }))
  .handler(async (ctx) => {
    const { user } = await getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    await db
      .delete(workoutTable)
      .where(
        and(eq(workoutTable.id, ctx.data.id), eq(workoutTable.userId, user.id)),
      );
  });

export const getWorkout = createServerFn({ method: "GET" })
  .validator(object({ id: string() }))
  .handler(async (ctx) => {
    const { user } = await getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const workout = await db.query.workout.findFirst({
      where: (workouts, { eq, and }) =>
        and(eq(workouts.id, ctx.data.id), eq(workouts.userId, user.id)),
      with: {
        exercises: {
          with: {
            exerciseType: true,
            sets: true,
          },
        },
      },
    });

    return workout ?? null;
  });

export const getWorkoutQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["workouts", id],
    queryFn: async () =>
      (await getWorkout({ data: { id } })) as WorkoutWithRelations | null,
  });
