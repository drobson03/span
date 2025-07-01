import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { format, set } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
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
import { getUser } from "~/lib/server/auth/functions";
import { db } from "~/lib/server/db";
import {
  type Workout,
  type WorkoutWithRelations,
  exercise,
  workout as workoutTable,
} from "~/lib/server/db/schema";

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
              sql`to_char(${workouts.date}, 'YYYY-MM')`,
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
    return await db.query.exerciseType.findMany({
      orderBy: (exerciseTypes, { asc }) => [asc(exerciseTypes.name)],
    });
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
  tags: array(string()),
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
        tags: workout.tags.length > 0 ? workout.tags : null,
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
        tags: workout.tags.length > 0 ? workout.tags : null,
        date: new Date(workout.datetime),
        updatedAt: new Date(),
      })
      .where(eq(workoutTable.id, workout.id));

    await db.delete(exercise).where(eq(exercise.workoutId, workout.id));

    if (workout.exercises.length > 0) {
      await db
        .insert(exercise)
        .values(
          workout.exercises.map((ex) => ({
            workoutId: workout.id,
            exerciseTypeId: ex.exerciseTypeId,
            weight: Number.parseFloat(ex.weight),
            targetReps: ex.targetReps,
            notes: ex.notes || null,
            sets: ex.sets,
          })),
        )
        .returning({ id: exercise.id });
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

export const getWorkoutsWithTagFilter = createServerFn({ method: "GET" })
  .validator(object({ tags: optional(array(string())) }))
  .handler(async (ctx) => {
    const { user } = await getUser();

    if (!user) {
      return [];
    }

    const { tags } = ctx.data;

    // Base query conditions
    const conditions = [eq(workoutTable.userId, user.id)];

    // Add tag filtering if tags are provided
    if (tags && tags.length > 0) {
      // Use PostgreSQL array contains operator for efficient tag filtering
      conditions.push(sql`${workoutTable.tags} @> ${tags}`);
    }

    return await db.query.workout.findMany({
      orderBy: (workouts, { desc }) => [desc(workouts.date)],
      where: and(...conditions),
      with: {
        exercises: {
          with: {
            exerciseType: true,
          },
        },
      },
    });
  });

export const getWorkoutsWithTagFilterQueryOptions = (tags?: string[]) =>
  queryOptions({
    queryKey: ["workouts", "filtered", tags],
    queryFn: () => getWorkoutsWithTagFilter({ data: { tags } }),
  });
