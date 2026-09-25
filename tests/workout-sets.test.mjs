import assert from "node:assert/strict";
import { test } from "node:test";
import { safeParse } from "valibot";
import {
  getExerciseSetStats,
  getSetWeight,
  WorkoutSetSchema,
} from "../src/lib/workout-sets.ts";

test("warm-ups, top sets and drop sets contribute their actual volume", () => {
  assert.deepEqual(
    getExerciseSetStats({
      weight: 100,
      sets: [
        { reps: 10, weight: 20 },
        { reps: 5, weight: 80 },
        { reps: 8, weight: 50 },
      ],
    }),
    { totalReps: 23, totalVolume: 1000, maxWeight: 80 },
  );
});

test("legacy and mixed sets fall back only when weight is absent", () => {
  assert.equal(getSetWeight({ reps: 10 }, 42.5), 42.5);
  assert.equal(getSetWeight({ reps: 10, weight: 0 }, 42.5), 0);
  assert.deepEqual(
    getExerciseSetStats({
      weight: 42.5,
      sets: [{ reps: 8 }, { reps: 10, weight: 0 }, { reps: 4, weight: 50 }],
    }),
    { totalReps: 22, totalVolume: 540, maxWeight: 50 },
  );
});

test("an exercise without sets contributes no weight or volume", () => {
  assert.deepEqual(getExerciseSetStats({ weight: 100, sets: [] }), {
    totalReps: 0,
    totalVolume: 0,
    maxWeight: 0,
  });
});

test("saved set data round-trips with distinct weights including zero", () => {
  const sets = [
    { reps: 8 },
    { reps: 5, weight: 55.25 },
    { reps: 12, weight: 0 },
  ];
  const normalized = sets.map((set) => ({
    ...set,
    weight: getSetWeight(set, 40),
  }));
  const saved = JSON.parse(JSON.stringify(normalized));
  assert.deepEqual(
    saved.map((set) => getSetWeight(set, 99)),
    [40, 55.25, 0],
  );
  for (const set of saved)
    assert.equal(safeParse(WorkoutSetSchema, set).success, true);
});

test("set validation accepts nonnegative fractional weights and whole reps", () => {
  for (const weight of [0, 2.5, 100.25]) {
    assert.equal(
      safeParse(WorkoutSetSchema, { reps: 0, weight }).success,
      true,
    );
  }
});

test("set validation rejects missing, negative, nonfinite and nonnumeric weights", () => {
  for (const weight of [undefined, null, -1, NaN, Infinity, -Infinity, "20"]) {
    assert.equal(
      safeParse(WorkoutSetSchema, { reps: 8, weight }).success,
      false,
    );
  }
  for (const reps of [-1, 1.5, NaN, Infinity]) {
    assert.equal(
      safeParse(WorkoutSetSchema, { reps, weight: 20 }).success,
      false,
    );
  }
});
