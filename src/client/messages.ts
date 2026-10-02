import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";
import { UrlRequest } from "foldkit/navigation";
import { Url } from "foldkit/url";
import { Claims } from "../shared/auth";
import { ExerciseTypeList, WorkoutList } from "../shared/workouts";

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  Navigated: {},
  Loaded: {
    session: Schema.NullOr(Claims),
    workouts: WorkoutList,
    exerciseTypes: ExerciseTypeList,
  },
  Failed: { error: Schema.String },
  SignedOut: {},
  Saved: {},
  Deleted: {},
  Registered: {},
  SignIn: {},
  SignOut: {},
  Retry: {},
  Submit: {},
  Register: {},
  RegistrationName: { value: Schema.String },
  Field: {
    field: Schema.Literals(["datetime", "notes", "tags"]),
    value: Schema.String,
  },
  AddExercise: {},
  RemoveExercise: { index: Schema.Int },
  MoveExercise: { index: Schema.Int, delta: Schema.Int },
  SetMetric: { metric: Schema.Literals(["maxWeight", "volume", "reps"]) },
  AddSet: { index: Schema.Int },
  RemoveSet: { index: Schema.Int, set: Schema.Int },
  ExerciseField: {
    index: Schema.Int,
    field: Schema.Literals(["exerciseTypeId", "weight", "targetReps", "notes"]),
    value: Schema.String,
  },
  SetReps: { index: Schema.Int, set: Schema.Int, value: Schema.String },
  ToggleTag: { tag: Schema.String },
  ChangeMonth: { delta: Schema.Int },
  AskDelete: { id: Schema.String },
  CancelDelete: {},
  ConfirmDelete: {},
});
export type Message = typeof Message.Type;
