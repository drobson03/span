import { Schema } from "effect";
import { Claims } from "../shared/auth";
import { ExerciseTypeList, WorkoutList } from "../shared/workouts";
import { Draft } from "./draft";

export const Model = Schema.Struct({
  path: Schema.String,
  search: Schema.String,
  session: Schema.NullOr(Claims),
  workouts: WorkoutList,
  exerciseTypes: ExerciseTypeList,
  draft: Draft,
  tags: Schema.Array(Schema.String),
  metric: Schema.Literals(["maxWeight", "volume", "reps"]),
  month: Schema.String,
  loading: Schema.Boolean,
  busy: Schema.Boolean,
  error: Schema.String,
  registrationName: Schema.String,
  deleteId: Schema.NullOr(Schema.String),
});
export type Model = typeof Model.Type;
