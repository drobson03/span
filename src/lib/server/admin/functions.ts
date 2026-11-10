import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { count, EmptyFilter, eq, getColumns, sql } from "drizzle-orm";
import {
  maxLength,
  minLength,
  object,
  picklist,
  pipe,
  string,
  trim,
} from "valibot";
import { getUser } from "~/lib/server/auth/functions";
import { db } from "~/lib/server/db";
import {
  exercise,
  exerciseMeasurements,
  exerciseType,
} from "~/lib/server/db/schema";
import { isAdmin } from "~/lib/utils";

async function requireAdmin() {
  const { user } = await getUser();

  if (!isAdmin(user)) {
    throw new Error("Not authorised");
  }

  return user!;
}

async function assertNameAvailable(name: string, id?: string) {
  const existing = await db.query.exerciseType.findFirst({
    where: {
      // biome-ignore lint/correctness/noComponentHookFactories: Drizzle's `RAW` filter, not a component.
      RAW: (table) => sql`lower(${table.name}) = lower(${name})`,
      id: id ? { ne: id } : EmptyFilter,
    },
  });

  if (existing) {
    throw new Error(`An exercise named "${existing.name}" already exists`);
  }
}

async function getUsageCount(id: string) {
  const [row] = await db
    .select({ count: count() })
    .from(exercise)
    .where(eq(exercise.exerciseTypeId, id));

  return row?.count ?? 0;
}

export const getAdminExerciseTypes = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();

    return await db
      .select({ ...getColumns(exerciseType), usage: count(exercise.id) })
      .from(exerciseType)
      .leftJoin(exercise, eq(exercise.exerciseTypeId, exerciseType.id))
      .groupBy(exerciseType.id)
      .orderBy(exerciseType.name);
  },
);

export const getAdminExerciseTypesQueryOptions = queryOptions({
  queryKey: ["exercise-types", "admin"],
  queryFn: async () => await getAdminExerciseTypes(),
});

const ExerciseTypeSchema = object({
  name: pipe(string(), trim(), minLength(1), maxLength(100)),
  measurement: picklist(exerciseMeasurements),
});

export const createExerciseType = createServerFn({ method: "POST" })
  .validator(ExerciseTypeSchema)
  .handler(async (ctx) => {
    await requireAdmin();
    await assertNameAvailable(ctx.data.name);

    await db.insert(exerciseType).values(ctx.data);
  });

export const updateExerciseType = createServerFn({ method: "POST" })
  .validator(object({ ...ExerciseTypeSchema.entries, id: string() }))
  .handler(async (ctx) => {
    await requireAdmin();

    const { id, name, measurement } = ctx.data;

    const existing = await db.query.exerciseType.findFirst({ where: { id } });

    if (!existing) {
      throw new Error("Exercise not found");
    }

    await assertNameAvailable(name, id);

    // Logged sets are stored as reps or seconds, so switching would misread them
    if (existing.measurement !== measurement && (await getUsageCount(id)) > 0) {
      throw new Error(
        "Can't change how an exercise is measured once it has been logged",
      );
    }

    await db
      .update(exerciseType)
      .set({ name, measurement })
      .where(eq(exerciseType.id, id));
  });

export const deleteExerciseType = createServerFn({ method: "POST" })
  .validator(object({ id: string() }))
  .handler(async (ctx) => {
    await requireAdmin();

    // Deleting cascades to every logged exercise, across all users
    if ((await getUsageCount(ctx.data.id)) > 0) {
      throw new Error("Can't delete an exercise that has been logged");
    }

    await db.delete(exerciseType).where(eq(exerciseType.id, ctx.data.id));
  });
