import { afterAll, expect, it, test, vi } from "@effect/vitest";
import { Effect, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { fromString } from "foldkit/url";

const origin = "http://localhost:3000";
vi.stubGlobal("window", { location: { origin } });
vi.stubGlobal("location", { origin, pathname: "/" });
const { request } = await import("../src/client/api");
const { Save } = await import("../src/client/commands");
const { init } = await import("../src/client/init");
const { Message } = await import("../src/client/messages");
const { update } = await import("../src/client/update");
const { draftToInput } = await import("../src/client/draft");
afterAll(() => vi.unstubAllGlobals());
const model = () =>
  init(Option.getOrThrow(fromString(`${origin}/workouts/new`))).model;

test("exercise edits preserve decimal weights, set operations, and immutable reordering", () => {
  const initial = {
    ...model(),
    exerciseTypes: [{ id: "squat", name: "Squat" }],
  };
  const added = update(initial, Message.AddExercise()).model;
  const weighted = update(
    added,
    Message.ExerciseField({ index: 0, field: "weight", value: "42.5" }),
  ).model;
  const setAdded = update(weighted, Message.AddSet({ index: 0 })).model;
  const repsChanged = update(
    setAdded,
    Message.SetReps({ index: 0, set: 1, value: "6" }),
  ).model;
  expect(draftToInput(repsChanged.draft).exercises[0]).toMatchObject({
    weight: 42.5,
    sets: [{ reps: 8 }, { reps: 6 }],
  });
  const removed = update(
    repsChanged,
    Message.RemoveSet({ index: 0, set: 0 }),
  ).model;
  expect(removed.draft.exercises[0]?.sets).toEqual(["6"]);
  const second = update(removed, Message.AddExercise()).model;
  const reordered = update(
    second,
    Message.MoveExercise({ index: 0, delta: 1 }),
  ).model;
  expect(reordered.draft.exercises[1]?.weight).toBe("42.5");
  expect(second.draft.exercises[0]?.weight).toBe("42.5");
  expect(
    update(second, Message.MoveExercise({ index: 0, delta: -1 })).model,
  ).toBe(second);
  expect(initial.draft.exercises).toEqual([]);
});

test("navigation keeps URL state and prevents duplicate submissions", () => {
  const initial = model();
  const changed = update(
    initial,
    Message.ChangedUrl({
      url: Option.getOrThrow(
        fromString(`${origin}/calendar/2026/11?filter=strength`),
      ),
    }),
  ).model;
  expect(changed).toMatchObject({
    path: "/calendar/2026/11",
    month: "2026-11-01",
    search: "filter=strength",
  });
  const submitted = update(initial, Message.Submit());
  expect(submitted.model.busy).toBe(true);
  expect(submitted.commands).toHaveLength(1);
  expect(update(submitted.model, Message.Submit()).commands).toBeUndefined();
  expect(
    update(submitted.model, Message.Failed({ error: "Check fields" })).model,
  ).toMatchObject({ busy: false, loading: false, error: "Check fields" });
});

it.effect(
  "invalid workout dates produce a user-facing message before sending a request",
  () =>
    Save({ draft: { ...model().draft, datetime: "invalid" } }).effect.pipe(
      Effect.tap((message) =>
        Effect.sync(() =>
          expect(message).toEqual(
            Message.Failed({
              error:
                "Enter a valid date, exercise, non-negative weight, and whole-number reps.",
            }),
          ),
        ),
      ),
    ),
);

it.effect(
  "Effect HTTP requests preserve cookies, CSRF headers, and JSON bodies",
  () => {
    const transport = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ id: "saved" }));
    return request("/api/workouts", "POST", { notes: "Test" }).pipe(
      Effect.provideService(FetchHttpClient.Fetch, transport),
      Effect.tap((body) =>
        Effect.promise(async () => {
          expect(body).toEqual({ id: "saved" });
          const [url, options] = transport.mock.calls[0]!;
          expect(String(url)).toBe(`${origin}/api/workouts`);
          expect(options).toMatchObject({
            method: "POST",
            credentials: "same-origin",
          });
          const payload = await new Request(String(url), options).json();
          expect(payload).toEqual({ notes: "Test" });
          const headers = new Headers(options?.headers);
          expect(headers.get("x-span-csrf")).toBe("1");
          expect(headers.get("x-effect-auth-csrf")).toBe("1");
        }),
      ),
    );
  },
);

it.effect.each([
  [401, "Your session expired. Sign in again."],
  [400, "Check the workout fields."],
  [500, "Unable to save or load workouts. Please try again."],
] as const)(
  "HTTP %s retains its typed user-facing failure",
  ([status, message]) => {
    const transport = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("{}", { status }));
    return request("/api/workouts").pipe(
      Effect.provideService(FetchHttpClient.Fetch, transport),
      Effect.flip,
      Effect.tap((failure) =>
        Effect.sync(() => expect(failure).toMatchObject({ message })),
      ),
    );
  },
);
