import { Auth } from "@yielded/auth";
import { and, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import {
  exercise,
  exerciseType,
  workout,
} from "../lib/server/db/schema/workouts";
import { WorkoutInput } from "../shared/workouts";
import { AppAuth } from "./auth-definition";
import { Database } from "./database";

export class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {}) {}
export const listWorkouts = (subjectId: string) =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.query.workout.findMany({
      where: { userId: subjectId },
      orderBy: { date: "desc" },
      with: { exercises: { with: { exerciseType: true } } },
    });
  });
export const saveWorkout = (
  subjectId: string,
  data: WorkoutInput,
  id?: string,
) =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.transaction(() =>
      Effect.gen(function* () {
        let workoutId: string;
        if (id) {
          const rows = yield* db
            .update(workout)
            .set({
              date: new Date(data.datetime),
              notes: data.notes || null,
              tags: data.tags.length ? [...data.tags] : null,
              updatedAt: new Date(),
            })
            .where(and(eq(workout.id, id), eq(workout.userId, subjectId)))
            .returning({ id: workout.id });
          if (!rows[0]) return yield* new NotFound();
          workoutId = rows[0].id;
          yield* db.delete(exercise).where(eq(exercise.workoutId, workoutId));
        } else {
          const rows = yield* db
            .insert(workout)
            .values({
              userId: subjectId,
              date: new Date(data.datetime),
              notes: data.notes || null,
              tags: data.tags.length ? [...data.tags] : null,
            })
            .returning({ id: workout.id });
          workoutId = rows[0]!.id;
        }
        if (data.exercises.length)
          yield* db.insert(exercise).values(
            data.exercises.map((e) => ({
              workoutId,
              exerciseTypeId: e.exerciseTypeId,
              weight: e.weight,
              targetReps: e.targetReps,
              notes: e.notes || null,
              sets: e.sets.map((s) => ({ reps: s.reps })),
            })),
          );
        return { id: workoutId };
      }),
    );
  });
export const deleteWorkout = (subjectId: string, id: string) =>
  Effect.gen(function* () {
    const db = yield* Database;
    const deleted = yield* db
      .delete(workout)
      .where(and(eq(workout.id, id), eq(workout.userId, subjectId)))
      .returning({ id: workout.id });
    if (!deleted.length) return yield* new NotFound();
  });
const currentSubject = Effect.gen(function* () {
  const auth = yield* AppAuth;
  return (yield* auth.requireSession()).subjectId;
});
const readInput = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  return yield* Schema.decodeUnknownEffect(WorkoutInput)(yield* request.json);
});
const response = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.flatMap((body) => HttpServerResponse.json(body)),
    Effect.catch((error: unknown) => {
      const tag =
        typeof error === "object" && error !== null && "_tag" in error
          ? error._tag
          : "";
      const status =
        tag === "NotFound"
          ? 404
          : tag === "AuthenticationRequired" || tag === "SessionInvalid"
            ? 401
            : tag === "SchemaError" || tag === "RequestError"
              ? 400
              : 500;
      return HttpServerResponse.json(
        {
          error:
            status === 500
              ? "Request failed"
              : status === 401
                ? "Sign in required"
                : status === 404
                  ? "Workout not found"
                  : "Invalid workout",
        },
        { status },
      );
    }),
  );
const mutate = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const authRequest = yield* Auth.AuthRequest;
    const admitted =
      authRequest.beforeMutation === undefined
        ? false
        : yield* authRequest.beforeMutation.pipe(
            Effect.as(true),
            Effect.catchTag("HookDenied", () => Effect.succeed(false)),
          );
    // Same-origin POSTs require an explicit header. Browsers cannot add it cross-origin without a preflight.
    if (!admitted || request.headers["x-span-csrf"] !== "1")
      return yield* HttpServerResponse.json(
        { error: "Invalid request" },
        { status: 403 },
      );
    return yield* response(effect);
  });
export const WorkoutRoutes = LayerRoutes();
function LayerRoutes() {
  return HttpRouter.addAll([
    HttpRouter.route(
      "GET",
      "/api/workouts",
      response(
        Effect.gen(function* () {
          return yield* listWorkouts(yield* currentSubject);
        }),
      ),
    ),
    HttpRouter.route(
      "GET",
      "/api/exercise-types",
      response(
        Effect.gen(function* () {
          yield* currentSubject;
          const db = yield* Database;
          return yield* db
            .select()
            .from(exerciseType)
            .orderBy(exerciseType.name);
        }),
      ),
    ),
    HttpRouter.route(
      "POST",
      "/api/workouts",
      mutate(
        Effect.gen(function* () {
          const subjectId = yield* currentSubject;
          return yield* saveWorkout(subjectId, yield* readInput);
        }),
      ),
    ),
    HttpRouter.route(
      "PUT",
      "/api/workouts/:id",
      mutate(
        Effect.gen(function* () {
          const subjectId = yield* currentSubject;
          const { id } = yield* HttpRouter.params;
          return yield* saveWorkout(subjectId, yield* readInput, id!);
        }),
      ),
    ),
    HttpRouter.route(
      "DELETE",
      "/api/workouts/:id",
      mutate(
        Effect.gen(function* () {
          const subjectId = yield* currentSubject;
          const { id } = yield* HttpRouter.params;
          yield* deleteWorkout(subjectId, id!);
          return { deleted: true };
        }),
      ),
    ),
  ]);
}
