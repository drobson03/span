import assert from "node:assert/strict";
import { test } from "node:test";
import {
  completedExercises,
  draftKey,
  newDraft,
  parseDraft,
  restRemaining,
} from "../src/lib/client/active-workout.ts";

const exercise = {
  id: "exercise-1",
  exerciseTypeId: "squat",
  weight: 60,
  targetReps: 8,
  sets: [
    { id: "set-1", reps: 7, completed: true },
    { id: "set-2", reps: 8, completed: false },
  ],
};

test("draft recovery preserves reps, completion and the absolute rest deadline", () => {
  const draft = {
    ...newDraft(),
    exercises: [exercise],
    restEndsAt: Date.now() + 90000,
  };
  assert.deepEqual(parseDraft(JSON.stringify(draft)), draft);
  assert.notEqual(draftKey("alice"), draftKey("bob"));
});

test("corrupt and incompatible drafts are rejected instead of silently reset", () => {
  for (const raw of [
    "{",
    "null",
    '{"version":2}',
    JSON.stringify({ ...newDraft(), exercises: [{ ...exercise, weight: -1 }] }),
  ]) {
    assert.throws(() => parseDraft(raw));
  }
});

test("only completed sets enter workout history, including zero-rep attempts", () => {
  const draft = {
    ...newDraft(),
    exercises: [
      exercise,
      {
        ...exercise,
        id: "exercise-2",
        sets: [{ id: "set-3", reps: 8, completed: false }],
      },
    ],
  };
  assert.deepEqual(completedExercises(draft), [
    {
      exerciseTypeId: "squat",
      weight: "60",
      targetReps: 8,
      notes: "",
      sets: [{ reps: 7 }],
    },
  ]);
  draft.exercises[0].sets = [{ id: "zero", reps: 0, completed: true }];
  assert.deepEqual(completedExercises(draft)[0].sets, [{ reps: 0 }]);
});

test("rest timer catches up after backgrounding or reload and never goes negative", () => {
  assert.equal(restRemaining(null, 1000), 0);
  assert.equal(restRemaining(91000, 1000), 90);
  assert.equal(restRemaining(91000, 60500), 31);
  assert.equal(restRemaining(91000, 150000), 0);
});
