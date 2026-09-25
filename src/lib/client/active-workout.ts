import * as v from "valibot";

const count = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(999));
const draftSchema = v.object({
  version: v.literal(1),
  startedAt: v.pipe(v.string(), v.isoTimestamp()),
  restSeconds: v.pipe(v.number(), v.integer(), v.minValue(15), v.maxValue(600)),
  restEndsAt: v.nullable(v.pipe(v.number(), v.minValue(0))),
  exercises: v.array(
    v.object({
      id: v.string(),
      exerciseTypeId: v.string(),
      weight: v.pipe(v.number(), v.minValue(0), v.maxValue(10000)),
      targetReps: count,
      sets: v.array(
        v.object({ id: v.string(), reps: count, completed: v.boolean() }),
      ),
    }),
  ),
});

export type ActiveWorkoutDraft = v.InferOutput<typeof draftSchema>;
export type ActiveExercise = ActiveWorkoutDraft["exercises"][number];

export const draftKey = (userId: string) => `span:active-workout:v1:${userId}`;
export const newDraft = (): ActiveWorkoutDraft => ({
  version: 1,
  startedAt: new Date().toISOString(),
  restSeconds: 90,
  restEndsAt: null,
  exercises: [],
});

export function parseDraft(raw: string): ActiveWorkoutDraft {
  return v.parse(draftSchema, JSON.parse(raw));
}

export function restRemaining(endsAt: number | null, now: number) {
  return endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function completedExercises(draft: ActiveWorkoutDraft) {
  return draft.exercises
    .map((exercise) => ({
      exerciseTypeId: exercise.exerciseTypeId,
      weight: String(exercise.weight),
      targetReps: exercise.targetReps,
      notes: "",
      sets: exercise.sets
        .filter((set) => set.completed)
        .map(({ reps }) => ({ reps })),
    }))
    .filter((exercise) => exercise.sets.length > 0);
}
