import * as v from "valibot";
import type { WorkoutSet } from "./server/db/schema/workouts";

export const SetWeightSchema = v.pipe(
  v.number("Please enter a valid weight"),
  v.finite("Please enter a finite weight"),
  v.minValue(0, "Weight must be zero or greater"),
);

export const WorkoutSetSchema = v.object({
  reps: v.pipe(v.number(), v.finite(), v.integer(), v.minValue(0)),
  weight: SetWeightSchema,
});

export function getSetWeight(set: WorkoutSet, exerciseWeight: number) {
  return set.weight ?? exerciseWeight;
}

export function getExerciseSetStats(exercise: {
  weight: number;
  sets: WorkoutSet[];
}) {
  return exercise.sets.reduce(
    (stats, set) => {
      const weight = getSetWeight(set, exercise.weight);
      return {
        totalReps: stats.totalReps + set.reps,
        totalVolume: stats.totalVolume + set.reps * weight,
        maxWeight: Math.max(stats.maxWeight, weight),
      };
    },
    { totalReps: 0, totalVolume: 0, maxWeight: 0 },
  );
}
