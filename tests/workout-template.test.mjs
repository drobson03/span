import assert from "node:assert/strict";
import test from "node:test";
import * as v from "valibot";
import {
  toWorkoutTemplate,
  workoutTemplateSchema,
} from "../src/lib/workout-template.ts";

const source = {
  id: "old-workout",
  date: new Date("2025-01-01"),
  notes: null,
  tags: ["push"],
  exercises: [
    {
      id: "old-exercise",
      exerciseTypeId: "bench",
      weight: 60,
      targetReps: 8,
      notes: "Slow tempo",
      sets: [{ reps: 8 }, { reps: 6 }],
    },
    {
      id: "old-exercise-2",
      exerciseTypeId: "press",
      weight: 30,
      targetReps: 10,
      notes: null,
      sets: [],
    },
  ],
};

test("copies exercises in order and resets achieved reps to targets without copying IDs or dates", () => {
  assert.deepEqual(toWorkoutTemplate(source), {
    notes: "",
    tags: ["push"],
    exercises: [
      {
        exerciseTypeId: "bench",
        weight: 60,
        targetReps: 8,
        notes: "Slow tempo",
        sets: [{ reps: 8 }, { reps: 8 }],
      },
      {
        exerciseTypeId: "press",
        weight: 30,
        targetReps: 10,
        notes: "",
        sets: [],
      },
    ],
  });
});

test("editing a copied template cannot mutate the source workout or saved routine", () => {
  const template = toWorkoutTemplate(source);
  template.tags.push("new-tag");
  template.exercises[0].sets[0].reps = 2;
  template.exercises.reverse();
  assert.deepEqual(source.tags, ["push"]);
  assert.equal(source.exercises[0].sets[0].reps, 8);
  assert.equal(source.exercises[0].exerciseTypeId, "bench");
});

test("rejects empty routines, missing exercises, and invalid targets", () => {
  const template = toWorkoutTemplate(source);
  assert.equal(v.safeParse(workoutTemplateSchema, template).success, true);
  assert.equal(
    v.safeParse(workoutTemplateSchema, { ...template, exercises: [] }).success,
    false,
  );
  for (const patch of [
    { exerciseTypeId: "" },
    { weight: NaN },
    { weight: Infinity },
    { targetReps: -1 },
    { targetReps: 1.5 },
  ]) {
    assert.equal(
      v.safeParse(workoutTemplateSchema, {
        ...template,
        exercises: [{ ...template.exercises[0], ...patch }],
      }).success,
      false,
    );
  }
});
