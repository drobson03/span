import * as v from "valibot";

export const workoutTemplateSchema = v.object({
  notes: v.pipe(v.string(), v.maxLength(1000)),
  tags: v.array(v.string()),
  exercises: v.pipe(
    v.array(
      v.object({
        exerciseTypeId: v.pipe(v.string(), v.minLength(1)),
        weight: v.pipe(v.number(), v.finite(), v.minValue(0)),
        targetReps: v.pipe(v.number(), v.integer(), v.minValue(0)),
        notes: v.pipe(v.string(), v.maxLength(1000)),
        sets: v.array(
          v.object({ reps: v.pipe(v.number(), v.integer(), v.minValue(0)) }),
        ),
      }),
    ),
    v.minLength(1, "Add at least one exercise to save a routine."),
  ),
});

export type WorkoutTemplate = v.InferOutput<typeof workoutTemplateSchema>;

// Only copy editable values. A template never carries persisted record IDs or dates.
export function toWorkoutTemplate(source: {
  notes: string | null;
  tags: string[] | null;
  exercises: Array<{
    exerciseTypeId: string;
    weight: number;
    targetReps: number;
    notes: string | null;
    sets: Array<{ reps: number }>;
  }>;
}): WorkoutTemplate {
  return {
    notes: source.notes ?? "",
    tags: [...(source.tags ?? [])],
    exercises: source.exercises.map((exercise) => ({
      exerciseTypeId: exercise.exerciseTypeId,
      weight: exercise.weight,
      targetReps: exercise.targetReps,
      notes: exercise.notes ?? "",
      sets: exercise.sets.map(() => ({ reps: exercise.targetReps })),
    })),
  };
}
