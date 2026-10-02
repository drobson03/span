import * as PgClient from "@effect/sql-pg/PgClient";
import { Database as AuthDatabase } from "@yielded/auth-persistence-drizzle/Postgres";
import { defineRelations } from "drizzle-orm";
import * as Drizzle from "drizzle-orm/effect-postgres";
import { Context, Layer, Redacted } from "effect";
import {
  exercise,
  exerciseType,
  workout,
} from "../lib/server/db/schema/workouts";

export const relations = defineRelations(
  { workout, exercise, exerciseType },
  (r) => ({
    workout: {
      exercises: r.many.exercise({
        from: r.workout.id,
        to: r.exercise.workoutId,
      }),
    },
    exercise: {
      exerciseType: r.one.exerciseType({
        from: r.exercise.exerciseTypeId,
        to: r.exerciseType.id,
        optional: false,
      }),
    },
  }),
);
export class Database extends Context.Service<
  Database,
  Drizzle.EffectPgDatabase<typeof relations>
>()("span/Database") {}
export const databaseLayer = (url: string) => {
  const sql = PgClient.layer({ url: Redacted.make(url) });
  return Layer.merge(
    Layer.effect(Database, Drizzle.makeWithDefaults({ relations })),
    Layer.effect(AuthDatabase, Drizzle.makeWithDefaults({})),
  ).pipe(Layer.provideMerge(sql));
};
