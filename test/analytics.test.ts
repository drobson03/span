import { expect, test } from "vitest";
import {
  filterWorkouts,
  progression,
  workoutsByDay,
} from "../src/shared/analytics";
import type { Workout } from "../src/shared/workouts";

const workout = (
  id: string,
  date: string,
  weight: number,
  sets: number[],
  tags: string[] | null,
): Workout => ({
  id,
  date,
  notes: null,
  tags,
  exercises: [
    {
      id: `exercise-${id}`,
      exerciseTypeId: "squat",
      exerciseType: { id: "squat", name: "Squat" },
      weight,
      targetReps: 8,
      notes: null,
      sets: sets.map((reps) => ({ reps })),
    },
  ],
});
test("daily progression combines sessions, preserves fractional volume, and sorts days", () => {
  const workouts = [
    workout("later", "2026-10-02T12:00:00", 50, [8], ["strength"]),
    workout("first", "2026-10-01T12:00:00", 42.5, [8, 6], ["strength", "legs"]),
    workout("second", "2026-10-01T18:00:00", 45, [5], null),
  ];
  expect(progression(workouts)).toEqual([
    {
      id: "squat",
      name: "Squat",
      data: [
        { date: "2026-10-01", maxWeight: 45, volume: 820, reps: 19, sets: 3 },
        { date: "2026-10-02", maxWeight: 50, volume: 400, reps: 8, sets: 1 },
      ],
    },
  ]);
  expect(workoutsByDay(workouts)["2026-10-01"]?.map((w) => w.id)).toEqual([
    "first",
    "second",
  ]);
  expect(
    filterWorkouts(workouts, ["strength", "legs"]).map((w) => w.id),
  ).toEqual(["first"]);
  expect(filterWorkouts(workouts, [])).toHaveLength(3);
});
