import * as PgliteClient from "@effect/sql-pglite/PgliteClient";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import * as DrizzlePglite from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Effect, Exit, Layer, Predicate } from "effect";
import { afterEach, beforeEach, expect, test } from "@effect/vitest";
import { user } from "../src/lib/server/db/schema/auth";
import { exerciseType } from "../src/lib/server/db/schema/workouts";
import { makeWebHandler } from "../src/server/application";
import { Database, databaseLayer, relations } from "../src/server/database";
import { adoptBaseline } from "../src/server/migrate";
import {
  deleteWorkout,
  listWorkouts,
  saveWorkout,
} from "../src/server/workouts";

let pg: PGlite;
let socket: PGLiteSocketServer;
let url: string;
const config = {
  AUTH_ORIGIN: "http://localhost:3000",
  AUTH_BINDING_SECRET: Buffer.alloc(32, 1).toString("base64url"),
  AUTH_TRANSACTION_SECRET: Buffer.alloc(32, 2).toString("base64url"),
  GOOGLE_CLIENT_ID: "test-client",
  GOOGLE_CLIENT_SECRET: "test-secret",
};
const input = {
  datetime: "2026-10-01T10:00:00+10:00",
  notes: "First workout",
  tags: ["strength"],
  exercises: [
    {
      exerciseTypeId: "squat",
      weight: 40,
      targetReps: 8,
      notes: "",
      sets: [{ reps: 8 }, { reps: 6 }],
    },
  ],
};
beforeEach(async () => {
  pg = await PGlite.create();
  for (const migration of readMigrationFiles({
    migrationsFolder: "./migrations",
  })) {
    for (const sql of migration.sql) {
      await pg.exec(sql);
    }
  }
  socket = new PGLiteSocketServer({ db: pg, port: 0, host: "127.0.0.1" });
  await socket.start();
  url = `postgresql://postgres@${socket.getServerConn()}/postgres`;
}, 30_000);
afterEach(async () => {
  await socket?.stop();
  await pg?.close();
});
test("Effect Drizzle CRUD isolates users and rolls back failed exercise replacements", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const db = yield* Database;
      yield* db.insert(user).values(
        ["alice", "bob"].map((id) => ({
          id,
          name: id,
          email: `${id}@example.com`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      yield* db.insert(exerciseType).values({ id: "squat", name: "Squat" });
      const created = yield* saveWorkout("alice", input);
      let workouts = yield* listWorkouts("alice");
      expect(workouts[0]?.exercises[0]?.exerciseType?.name).toBe("Squat");
      expect(workouts[0]?.exercises[0]?.sets).toEqual(input.exercises[0]!.sets);
      expect(yield* listWorkouts("bob")).toEqual([]);
      expect(
        Exit.isFailure(
          yield* Effect.exit(saveWorkout("bob", input, created.id)),
        ),
      ).toBe(true);
      expect(
        Exit.isFailure(yield* Effect.exit(deleteWorkout("bob", created.id))),
      ).toBe(true);
      expect(
        Exit.isFailure(
          yield* Effect.exit(
            saveWorkout(
              "alice",
              {
                ...input,
                notes: "Must roll back",
                exercises: [
                  { ...input.exercises[0]!, exerciseTypeId: "missing" },
                ],
              },
              created.id,
            ),
          ),
        ),
      ).toBe(true);
      workouts = yield* listWorkouts("alice");
      expect(workouts[0]?.notes).toBe("First workout");
      expect(workouts[0]?.exercises).toHaveLength(1);
      yield* saveWorkout(
        "alice",
        { ...input, notes: "Updated", exercises: [] },
        created.id,
      );
      expect((yield* listWorkouts("alice"))[0]?.exercises).toEqual([]);
      yield* deleteWorkout("alice", created.id);
      expect(yield* listWorkouts("alice")).toEqual([]);
    }).pipe(
      Effect.provide(
        Layer.effect(
          Database,
          DrizzlePglite.makeWithDefaults({ relations }),
        ).pipe(Layer.provide(PgliteClient.layer({ liveClient: pg }))),
      ),
    ),
  );
}, 30_000);
test("Yielded HTTP layers initialize and protect API and auth mutations", async () => {
  const app = makeWebHandler({ ...config, DATABASE_URL: url });
  await Effect.runPromise(
    Effect.acquireUseRelease(
      Effect.void,
      () =>
        Effect.promise(async () => {
          const response = await app.handler(
            new Request("http://localhost:3000/api/workouts"),
          );
          expect(response.status).toBe(401);
          const csrf = await app.handler(
            new Request("http://localhost:3000/api/workouts", {
              method: "POST",
              body: "{}",
            }),
          );
          expect(csrf.status).toBe(403);
          const auth = await app.handler(
            new Request("http://localhost:3000/auth/signIn", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ provider: "google", returnTarget: "/" }),
            }),
          );
          expect([400, 403]).toContain(auth.status);
        }),
      () =>
        Effect.promise(async () => {
          await app.dispose();
        }),
    ),
  );
}, 30_000);
test("existing Better Auth Google identities migrate without changing workout ownership", async () => {
  const existing = await PGlite.create();
  const migrations = readMigrationFiles({ migrationsFolder: "./migrations" });
  for (const sql of migrations[0]!.sql) {
    await existing.exec(sql);
  }
  await existing.exec(`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES ('existing', 'Existing', 'existing@example.com', true, now(), now());
    INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at) VALUES ('google-old', 'google-subject', 'google', 'existing', now(), now());
    INSERT INTO workout (id, user_id, date) VALUES ('old-workout', 'existing', now());`);
  const server = new PGLiteSocketServer({ db: existing, port: 0 });
  await server.start();
  await Effect.runPromise(
    Effect.acquireUseRelease(
      Effect.void,
      () =>
        Effect.promise(async () => {
          await Effect.runPromise(
            Effect.gen(function* () {
              yield* adoptBaseline;
              yield* migrate(yield* Database, {
                migrationsFolder: "./migrations",
              });
            }).pipe(
              Effect.provide(
                databaseLayer(
                  `postgresql://postgres@${server.getServerConn()}/postgres`,
                ),
              ),
            ),
          );
          const login = await existing.query<{ subject_id: string }>(
            "select subject_id from span_oauth_login",
          );
          expect(login.rows[0]?.subject_id).toBe("existing");
          const workouts = await existing.query<{ user_id: string }>(
            "select user_id from workout",
          );
          expect(workouts.rows[0]?.user_id).toBe("existing");
          const credentials = await existing.query(
            "select * from span_auth_credentials",
          );
          expect(credentials.rows).toHaveLength(1);
          const history = await existing.query(
            "select * from drizzle.__drizzle_migrations",
          );
          expect(history.rows).toHaveLength(2);
        }),
      () =>
        Effect.promise(async () => {
          await server.stop();
          await existing.close();
        }),
    ),
  );
}, 30_000);

test("Google registration, fresh sign-in, session cookies, and authenticated workout mutations", async () => {
  const { google } = await import("./oauth-provider");
  const app = makeWebHandler({ ...config, DATABASE_URL: url }, google);
  const cookies = new Map<string, string>();
  const send = async (
    path: string,
    data?: unknown,
    method = data === undefined ? "GET" : "POST",
    origin = config.AUTH_ORIGIN,
  ) => {
    const response = await app.handler(
      new Request(`${config.AUTH_ORIGIN}${path}`, {
        method,
        headers: {
          origin,
          "content-type": "application/json",
          "x-effect-auth-csrf": "1",
          "x-span-csrf": "1",
          cookie: [...cookies]
            .map(([key, value]) => `${key}=${value}`)
            .join("; "),
        },
        ...(data === undefined
          ? {}
          : {
              body: JSON.stringify(
                path.startsWith("/auth/") ? { payload: data } : data,
              ),
            }),
      }),
    );
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0]!;
      const index = pair.indexOf("=");
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (value) {
        cookies.set(name, value);
      } else {
        cookies.delete(name);
      }
    }
    return response;
  };
  const begin = async () => {
    const response = await send("/auth/signIn", {
      flowId: crypto.randomUUID(),
      commandId: crypto.randomUUID(),
      provider: "google",
      returnTarget: "/",
    });
    const body = await response.json();
    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(Predicate.isTagged(body, "Success")).toBe(true);
    const state = new URL(body.value.authorizationUrl).searchParams.get(
      "state",
    );
    return send(
      `/auth/google/callback?code=test-code&state=${state}&iss=${encodeURIComponent("https://accounts.google.com")}`,
    );
  };
  await Effect.runPromise(
    Effect.acquireUseRelease(
      Effect.void,
      () =>
        Effect.promise(async () => {
          const callback = await begin();
          expect(callback.status, await callback.clone().text()).toBe(303);
          const target = new URL(
            callback.headers.get("location")!,
            config.AUTH_ORIGIN,
          );
          expect(target.pathname).toBe("/register");
          const registered = await send("/auth/register", {
            flowId: target.searchParams.get("flowId"),
            reference: target.searchParams.get("reference"),
            commandId: crypto.randomUUID(),
            registration: { displayName: "New lifter" },
          });
          expect(registered.status, await registered.clone().text()).toBe(200);
          const registration = await registered.json();
          expect(
            Predicate.isTagged(registration.value, "RegistrationAccepted"),
          ).toBe(true);
          const unauthenticated = await send("/api/workouts");
          expect(unauthenticated.status).toBe(401);
          const signedIn = await begin();
          expect(signedIn.status, await signedIn.clone().text()).toBe(303);
          expect(signedIn.headers.get("location")).toBe("/");
          expect(cookies.has("span-session")).toBe(true);
          const session = await send("/auth/getSession");
          expect(session.status, await session.clone().text()).toBe(200);
          const sessionBody = await session.json();
          expect(sessionBody.value.claims).toEqual({
            displayName: "New lifter",
            email: "new@example.com",
          });
          await pg.exec(
            "INSERT INTO exercise_type (id, name) VALUES ('squat', 'Squat')",
          );
          const rejected = await send(
            "/api/workouts",
            input,
            "POST",
            "https://attacker.example",
          );
          expect(rejected.status).toBe(403);
          const invalid = await send("/api/workouts", {
            ...input,
            datetime: "invalid",
          });
          expect(invalid.status).toBe(400);
          const created = await send("/api/workouts", input);
          expect(created.status, await created.clone().text()).toBe(200);
          const { id } = await created.json();
          const list = await send("/api/workouts");
          expect(list.status).toBe(200);
          const workouts = await list.json();
          expect(workouts[0].exercises[0].exerciseType.name).toBe("Squat");
          const updated = await send(
            `/api/workouts/${id}`,
            { ...input, notes: "Through HTTP" },
            "PUT",
          );
          expect(updated.status).toBe(200);
          const deleted = await send(
            `/api/workouts/${id}`,
            undefined,
            "DELETE",
          );
          expect(deleted.status).toBe(200);
          const emptyWorkouts = await send("/api/workouts");
          expect(await emptyWorkouts.json()).toEqual([]);
          const signedOut = await send("/auth/signOut", {});
          expect(signedOut.status).toBe(200);
          const expired = await send("/api/workouts");
          expect(expired.status).toBe(401);
        }),
      () =>
        Effect.promise(async () => {
          await app.dispose();
        }),
    ),
  );
}, 30_000);
