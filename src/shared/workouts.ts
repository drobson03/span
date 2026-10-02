import { Schema } from "effect";

const Count = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(10_000),
);
export const SetData = Schema.Struct({ reps: Count });
export const ExerciseData = Schema.Struct({
  exerciseTypeId: Schema.NonEmptyString,
  weight: Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(10_000),
  ),
  targetReps: Count,
  notes: Schema.String.check(Schema.isMaxLength(1000)),
  sets: Schema.Array(SetData).check(Schema.isMaxLength(100)),
});
export const WorkoutInput = Schema.Struct({
  datetime: Schema.String.check(
    Schema.makeFilter((s) => Number.isFinite(Date.parse(s))),
  ),
  notes: Schema.String.check(Schema.isMaxLength(1000)),
  tags: Schema.Array(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  ).check(Schema.isMaxLength(50)),
  exercises: Schema.Array(ExerciseData).check(Schema.isMaxLength(100)),
});
export const ExerciseType = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});
export const Workout = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  notes: Schema.NullOr(Schema.String),
  tags: Schema.NullOr(Schema.Array(Schema.String)),
  exercises: Schema.Array(
    Schema.Struct({
      ...ExerciseData.fields,
      id: Schema.String,
      notes: Schema.NullOr(Schema.String),
      exerciseType: ExerciseType,
    }),
  ),
});
export type Workout = typeof Workout.Type;
export type WorkoutInput = typeof WorkoutInput.Type;
export const WorkoutList = Schema.Array(Workout);
export const ExerciseTypeList = Schema.Array(ExerciseType);
