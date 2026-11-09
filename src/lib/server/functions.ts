import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { format, set } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import {
  array,
  date,
  type InferInput,
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
  exercise,
  type Workout,
  type WorkoutWithRelations,
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
        orderBy: { date: "desc" },
        where: { userId: user.id, date: { gte: startDate } },
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
        orderBy: { date: "desc" },
        where: {
          userId: user.id,
          // biome-ignore lint/correctness/noComponentHookFactories: Drizzle's `RAW` filter, not a component.
          RAW: (workouts) =>
            sql`to_char(${workouts.date}, 'YYYY-MM') = ${format(monthDate, "yyyy-MM")}`,
        },
      }),
    );
  });

export const getWorkoutsByDateForMonthQueryOptions = (month: Date) =>
  queryOptions({
    queryKey: ["workouts", month],
    queryFn: async () => await getWorkoutsByDateForMonth({ data: { month } }),
  });

const WORKOUTS_PAGE_SIZE = 25;

export const getWorkoutsPage = createServerFn({ method: "GET" })
  .validator(
    object({
      cursor: optional(string()),
      tags: optional(array(string())),
    }),
  )
  .handler(async (ctx) => {
    const { user } = await getUser();

    if (!user) {
      return { workouts: [], nextCursor: null };
    }

    const { cursor, tags } = ctx.data;

    const workouts = await db.query.workout.findMany({
      orderBy: { date: "desc", id: "desc" },
      where: {
        userId: user.id,
        // Match any of the tags
        tags: tags && tags.length > 0 ? { arrayOverlaps: tags } : undefined,
        // Keyset pagination on (date, id), relative to the last workout seen.
        // `RAW` gets the query's alias for the table, not `workoutTable`.
        RAW: cursor
          ? (workouts) =>
              sql`(${workouts.date}, ${workouts.id}) < (select "c"."date", "c"."id" from ${workoutTable} "c" where "c"."id" = ${cursor})`
          : undefined,
      },
      limit: WORKOUTS_PAGE_SIZE + 1,
      with: {
        exercises: {
          with: {
            exerciseType: true,
          },
        },
      },
    });

    const hasMore = workouts.length > WORKOUTS_PAGE_SIZE;
    const page = hasMore ? workouts.slice(0, WORKOUTS_PAGE_SIZE) : workouts;

    return {
      workouts: page,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  });

export const getWorkoutsInfiniteQueryOptions = (tags: string[] = []) =>
  infiniteQueryOptions({
    queryKey: ["workouts", "list", { tags }],
    queryFn: ({ pageParam }) =>
      getWorkoutsPage({
        data: { cursor: pageParam, tags: tags.length > 0 ? tags : undefined },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

export const getWorkoutTags = createServerFn({ method: "GET" }).handler(
  async () => {
    const { user } = await getUser();

    if (!user) {
      return [];
    }

    const rows = await db
      .selectDistinct({ tag: sql<string>`unnest(${workoutTable.tags})` })
      .from(workoutTable)
      .where(eq(workoutTable.userId, user.id))
      .orderBy(sql`1`);

    return rows.map((row) => row.tag);
  },
);

export const getWorkoutTagsQueryOptions = queryOptions({
  queryKey: ["workouts", "tags"],
  queryFn: () => getWorkoutTags(),
});

export const getExerciseTypes = createServerFn({ method: "GET" }).handler(
  async () => {
    return await db.query.exerciseType.findMany({
      orderBy: { name: "asc" },
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
      where: { id: workout.id, userId: user.id },
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
      where: { id: ctx.data.id, userId: user.id },
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

export type ExerciseProgressionData = {
  date: string;
  maxWeight: number;
  totalVolume: number;
  totalReps: number;
  sets: number;
};

export type ExerciseTypeProgression = {
  exerciseTypeId: string;
  exerciseTypeName: string;
  data: ExerciseProgressionData[];
};

export const getExerciseProgression = createServerFn({ method: "GET" }).handler(
  async () => {
    const { user } = await getUser();

    if (!user) {
      return [];
    }

    const workouts = await db.query.workout.findMany({
      orderBy: { date: "asc" },
      where: { userId: user.id },
      with: {
        exercises: {
          with: {
            exerciseType: true,
          },
        },
      },
    });

    const exerciseTypeMap = new Map<string, ExerciseTypeProgression>();

    for (const workout of workouts) {
      const dateStr = format(workout.date, "yyyy-MM-dd");

      for (const ex of workout.exercises) {
        if (!exerciseTypeMap.has(ex.exerciseTypeId)) {
          exerciseTypeMap.set(ex.exerciseTypeId, {
            exerciseTypeId: ex.exerciseTypeId,
            exerciseTypeName: ex.exerciseType.name,
            data: [],
          });
        }

        const totalReps = ex.sets.reduce((sum, s) => sum + s.reps, 0);
        const totalVolume = totalReps * ex.weight;

        const progression = exerciseTypeMap.get(ex.exerciseTypeId)!;
        const existingEntry = progression.data.find((d) => d.date === dateStr);

        if (existingEntry) {
          existingEntry.maxWeight = Math.max(existingEntry.maxWeight, ex.weight);
          existingEntry.totalVolume += totalVolume;
          existingEntry.totalReps += totalReps;
          existingEntry.sets += ex.sets.length;
        } else {
          progression.data.push({
            date: dateStr,
            maxWeight: ex.weight,
            totalVolume,
            totalReps,
            sets: ex.sets.length,
          });
        }
      }
    }

    return Array.from(exerciseTypeMap.values()).sort((a, b) =>
      a.exerciseTypeName.localeCompare(b.exerciseTypeName),
    );
  },
);

export const getExerciseProgressionQueryOptions = () =>
  queryOptions({
    queryKey: ["exercise-progression"],
    queryFn: async () => await getExerciseProgression(),
  });
