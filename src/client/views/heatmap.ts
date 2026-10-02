import {
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
  subDays,
} from "date-fns";
import type { HtmlBuilder } from "foldkit/html";
import { dayKey, workoutsByDay } from "../../shared/analytics";
import type { Message } from "../messages";
import type { Model } from "../model";
import { section } from "./shared";

export const heatmap = (model: Model, h: HtmlBuilder<Message>) => {
  const grouped = workoutsByDay(model.workouts);
  const today = new Date();
  const days = eachDayOfInterval({
    start: startOfWeek(subDays(today, 364)),
    end: endOfWeek(today),
  });
  return section(h, "Training consistency", [
    h.p(
      [h.Class("mb-4 text-muted-foreground")],
      [
        `${model.workouts.filter((w) => new Date(w.date) >= subDays(today, 365)).length} workouts in the past year`,
      ],
    ),
    h.div(
      [h.Class("overflow-x-auto")],
      [
        h.div(
          [h.Class("grid grid-flow-col grid-rows-7 gap-1 min-w-[660px]")],
          days.map((date) => {
            const count = grouped[dayKey(date)]?.length ?? 0;
            return h.div([
              h.Class(
                `h-3 rounded-sm ${count === 0 ? "bg-muted" : count === 1 ? "bg-emerald-300" : count === 2 ? "bg-emerald-500" : "bg-emerald-700"}`,
              ),
              h.Title(`${format(date, "PPP")}: ${count} workouts`),
              h.AriaLabel(`${format(date, "PPP")}: ${count} workouts`),
            ]);
          }),
        ),
      ],
    ),
    h.p(
      [h.Class("mt-3 text-xs text-muted-foreground")],
      ["Past year · Each square is one day · Darker means more workouts"],
    ),
  ]);
};
