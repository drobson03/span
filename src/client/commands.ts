import { Effect, Layer, Redacted, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { catch as recoverFailure } from "effect/Effect";
import { Command } from "foldkit";
import { load, pushUrl } from "foldkit/navigation";
import { ExerciseTypeList, WorkoutList } from "../shared/workouts";
import { AppClient, request } from "./api";
import { Draft, draftToInput } from "./draft";
import { Message } from "./messages";

export const Navigate = Command.define("Navigate", {
  args: { url: Schema.String },
  messages: [Message.Navigated],
  execute: ({ url }) => pushUrl(url).pipe(Effect.as(Message.Navigated())),
});
export const External = Command.define("External", {
  args: { url: Schema.String },
  messages: [Message.Navigated],
  execute: ({ url }) => load(url).pipe(Effect.as(Message.Navigated())),
});
const failed = () =>
  Message.Failed({ error: "Request failed. Please try again." });
const decodeWorkouts = Schema.decodeUnknownEffect(WorkoutList);
const decodeExerciseTypes = Schema.decodeUnknownEffect(ExerciseTypeList);
class DraftValidationError extends Schema.TaggedError<DraftValidationError>()(
  "DraftValidationError",
  {},
) {}
export const LoadData = Command.define("LoadData", {
  messages: [Message.Loaded, Message.Failed],
  execute: Effect.gen(function* () {
    const client = yield* AppClient;
    const session = yield* client.auth.getSession();
    if (!session) {
      return Message.Loaded({ session: null, workouts: [], exerciseTypes: [] });
    }
    const [workouts, exerciseTypes] = yield* Effect.all(
      [
        request("/api/workouts").pipe(Effect.flatMap(decodeWorkouts)),
        request("/api/exercise-types").pipe(
          Effect.flatMap(decodeExerciseTypes),
        ),
      ],
      { concurrency: "unbounded" },
    );
    return Message.Loaded({ session: session.claims, workouts, exerciseTypes });
  }).pipe(
    Effect.provide(AppClient.layer.pipe(Layer.provide(FetchHttpClient.layer))),
    Effect.catchTag("RequestFailure", (failure) =>
      Effect.succeed(Message.Failed({ error: failure.message })),
    ),
    recoverFailure(() => Effect.succeed(failed())),
  ),
});
export const SignIn = Command.define("SignIn", {
  messages: [Message.Navigated, Message.Failed],
  execute: Effect.gen(function* () {
    const client = yield* AppClient;
    const started = yield* client.auth.signIn({
      provider: "google",
      returnTarget: "/",
    });
    yield* load(Redacted.value(started.authorizationUrl));
    return Message.Navigated();
  }).pipe(
    Effect.provide(AppClient.layer.pipe(Layer.provide(FetchHttpClient.layer))),
    recoverFailure(() => Effect.succeed(failed())),
  ),
});
export const SignOut = Command.define("SignOut", {
  messages: [Message.SignedOut, Message.Failed],
  execute: Effect.gen(function* () {
    const client = yield* AppClient;
    yield* client.auth.signOut();
    return Message.SignedOut();
  }).pipe(
    Effect.provide(AppClient.layer.pipe(Layer.provide(FetchHttpClient.layer))),
    recoverFailure(() => Effect.succeed(failed())),
  ),
});
export const Save = Command.define("Save", {
  args: { draft: Draft },
  messages: [Message.Saved, Message.Failed],
  execute: ({ draft }) =>
    Effect.try({
      try: () => draftToInput(draft),
      catch: () => new DraftValidationError(),
    }).pipe(
      Effect.flatMap((data) =>
        request(
          draft.id
            ? `/api/workouts/${encodeURIComponent(draft.id)}`
            : "/api/workouts",
          draft.id ? "PUT" : "POST",
          data,
        ),
      ),
      Effect.as(Message.Saved()),
      Effect.catchTag("RequestFailure", (failure) =>
        Effect.succeed(Message.Failed({ error: failure.message })),
      ),
      Effect.catchTag("DraftValidationError", () =>
        Effect.succeed(
          Message.Failed({
            error:
              "Enter a valid date, exercise, non-negative weight, and whole-number reps.",
          }),
        ),
      ),
      recoverFailure(() => Effect.succeed(failed())),
    ),
});
export const Delete = Command.define("Delete", {
  args: { id: Schema.String },
  messages: [Message.Deleted, Message.Failed],
  execute: ({ id }) =>
    request(`/api/workouts/${encodeURIComponent(id)}`, "DELETE").pipe(
      Effect.as(Message.Deleted()),
      Effect.catchTag("RequestFailure", (failure) =>
        Effect.succeed(Message.Failed({ error: failure.message })),
      ),
      recoverFailure(() => Effect.succeed(failed())),
    ),
});
export const Register = Command.define("Register", {
  args: { name: Schema.String, search: Schema.String },
  messages: [Message.Registered, Message.Failed],
  execute: ({ name, search }) =>
    Effect.gen(function* () {
      const params = new URLSearchParams(search);
      const client = yield* AppClient;
      yield* client.auth.register({
        reference: params.get("reference")!,
        flowId: params.get("flowId")!,
        commandId: crypto.randomUUID(),
        registration: { displayName: name.trim() },
      });
      return Message.Registered();
    }).pipe(
      Effect.provide(
        AppClient.layer.pipe(Layer.provide(FetchHttpClient.layer)),
      ),
      recoverFailure(() => Effect.succeed(failed())),
    ),
});
