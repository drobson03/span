import { defineRelations } from "drizzle-orm";
import * as auth from "./auth";
import * as workouts from "./workouts";

export const relations = defineRelations(
  { ...auth, ...workouts },
  (r) => ({
    user: {
      workouts: r.many.workout(),
      sessions: r.many.session(),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
        optional: false,
      }),
    },
    workout: {
      user: r.one.user({
        from: r.workout.userId,
        to: r.user.id,
        optional: false,
      }),
      exercises: r.many.exercise(),
    },
    exerciseType: {
      exercises: r.many.exercise(),
    },
    exercise: {
      workout: r.one.workout({
        from: r.exercise.workoutId,
        to: r.workout.id,
        optional: false,
      }),
      exerciseType: r.one.exerciseType({
        from: r.exercise.exerciseTypeId,
        to: r.exerciseType.id,
        optional: false,
      }),
    },
  }),
);
