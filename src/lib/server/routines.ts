import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import * as v from "valibot";
import { getUser } from "./auth/functions";
import { db } from "./db";
import { exerciseType, routine } from "./db/schema";
import {
  toWorkoutTemplate,
  workoutTemplateSchema,
} from "~/lib/workout-template";

export const getRoutines = createServerFn({ method: "GET" }).handler(
  async () => {
    const { user } = await getUser();
    if (!user) throw new Error("Not authenticated");
    return db.query.routine.findMany({
      where: eq(routine.userId, user.id),
      orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
    });
  },
);

export const getRoutinesQueryOptions = queryOptions({
  queryKey: ["routines"],
  queryFn: () => getRoutines(),
});

export const saveRoutine = createServerFn({ method: "POST" })
  .inputValidator(
    v.object({
      name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
      template: workoutTemplateSchema,
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getUser();
    if (!user) throw new Error("Not authenticated");
    const ids = [
      ...new Set(data.template.exercises.map((ex) => ex.exerciseTypeId)),
    ];
    const types = await db
      .select({ id: exerciseType.id })
      .from(exerciseType)
      .where(inArray(exerciseType.id, ids));
    if (types.length !== ids.length)
      throw new Error("One or more exercises no longer exist.");
    await db.insert(routine).values({
      userId: user.id,
      name: data.name,
      template: toWorkoutTemplate(data.template),
    });
  });

export const deleteRoutine = createServerFn({ method: "POST" })
  .inputValidator(v.object({ id: v.string() }))
  .handler(async ({ data }) => {
    const { user } = await getUser();
    if (!user) throw new Error("Not authenticated");
    await db
      .delete(routine)
      .where(and(eq(routine.id, data.id), eq(routine.userId, user.id)));
  });

export const getLastWorkout = createServerFn({ method: "GET" }).handler(
  async () => {
    const { user } = await getUser();
    if (!user) throw new Error("Not authenticated");
    return (
      (await db.query.workout.findFirst({
        where: (table, { eq, and, lte }) =>
          and(eq(table.userId, user.id), lte(table.date, new Date())),
        orderBy: (table, { desc }) => [
          desc(table.date),
          desc(table.createdAt),
          desc(table.id),
        ],
        with: {
          exercises: {
            orderBy: (table, { asc }) => [asc(table.position), asc(table.id)],
          },
        },
      })) ?? null
    );
  },
);
