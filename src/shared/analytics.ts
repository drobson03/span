import { format } from "date-fns";
import type { Workout } from "./workouts";
export const dayKey = (date: string | Date) =>
  format(new Date(date), "yyyy-MM-dd");
export const workoutsByDay = (workouts: readonly Workout[]) => {
  const result: Record<string, Workout[]> = {};
  for (const workout of workouts) {
    const key = dayKey(workout.date);
    result[key] ??= [];
    result[key].push(workout);
  }
  return result;
};
export const filterWorkouts = (
  workouts: readonly Workout[],
  tags: readonly string[],
) => workouts.filter((w) => tags.every((t) => w.tags?.includes(t)));
export const progression = (workouts: readonly Workout[]) => {
  const groups = new Map<
    string,
    {
      name: string;
      days: Map<
        string,
        {
          date: string;
          maxWeight: number;
          volume: number;
          reps: number;
          sets: number;
        }
      >;
    }
  >();
  for (const w of workouts)
    for (const e of w.exercises) {
      const group = groups.get(e.exerciseTypeId) ?? {
        name: e.exerciseType.name,
        days: new Map(),
      };
      groups.set(e.exerciseTypeId, group);
      const date = dayKey(w.date);
      const point = group.days.get(date) ?? {
        date,
        maxWeight: 0,
        volume: 0,
        reps: 0,
        sets: 0,
      };
      const reps = e.sets.reduce((sum, s) => sum + s.reps, 0);
      point.maxWeight = Math.max(point.maxWeight, e.weight);
      point.volume += reps * e.weight;
      point.reps += reps;
      point.sets += e.sets.length;
      group.days.set(date, point);
    }
  return [...groups]
    .map(([id, g]) => ({
      id,
      name: g.name,
      data: [...g.days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
