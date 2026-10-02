import { format } from "date-fns";
import { Schema } from "effect";
import { WorkoutInput } from "../shared/workouts";
import type { Workout } from "../shared/workouts";

const DraftExercise = Schema.Struct({
  exerciseTypeId: Schema.String,
  weight: Schema.String,
  targetReps: Schema.String,
  notes: Schema.String,
  sets: Schema.Array(Schema.String),
});
export const Draft = Schema.Struct({
  id: Schema.NullOr(Schema.String),
  datetime: Schema.String,
  notes: Schema.String,
  tags: Schema.String,
  exercises: Schema.Array(DraftExercise),
});
export const blankDraft = (): typeof Draft.Type => ({
  id: null,
  datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  notes: "",
  tags: "",
  exercises: [],
});
const decodeWorkoutInput = Schema.decodeUnknownSync(WorkoutInput);
export const draftToInput = (draft: typeof Draft.Type) =>
  decodeWorkoutInput({
    datetime: new Date(draft.datetime).toISOString(),
    notes: draft.notes,
    tags: [
      ...new Set(
        draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ],
    exercises: draft.exercises.map((e) => ({
      exerciseTypeId: e.exerciseTypeId,
      weight: e.weight.trim() ? Number(e.weight) : Number.NaN,
      targetReps: e.targetReps.trim() ? Number(e.targetReps) : Number.NaN,
      notes: e.notes,
      sets: e.sets.map((reps) => ({
        reps: reps.trim() ? Number(reps) : Number.NaN,
      })),
    })),
  });
export const editDraft = (
  workouts: readonly Workout[],
  path: string,
): typeof Draft.Type | null => {
  const match = /^\/workouts\/edit\/([^/]+)$/.exec(path);
  if (!match) {
    return null;
  }
  const w = workouts.find((w) => w.id === decodeURIComponent(match[1]!));
  if (!w) {
    return null;
  }
  return {
    id: w.id,
    datetime: format(new Date(w.date), "yyyy-MM-dd'T'HH:mm"),
    notes: w.notes ?? "",
    tags: w.tags?.join(", ") ?? "",
    exercises: w.exercises.map((e) => ({
      exerciseTypeId: e.exerciseTypeId,
      weight: String(e.weight),
      targetReps: String(e.targetReps),
      notes: e.notes ?? "",
      sets: e.sets.map((s) => String(s.reps)),
    })),
  };
};
