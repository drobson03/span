import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { HtmlBuilder } from "foldkit/html";
import { button } from "../../components/ui/button";
import { dayKey, workoutsByDay } from "../../shared/analytics";
import { Message } from "../messages";
import type { Model } from "../model";

export const calendarView = (model: Model, h: HtmlBuilder<Message>) => {
  const month = new Date(model.month);
  const grouped = workoutsByDay(model.workouts);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
  return h.div(
    [h.Class("space-y-4")],
    [
      h.div(
        [h.Class("flex justify-between items-center")],
        [
          button(
            { variant: "outline", onClick: Message.ChangeMonth({ delta: -1 }) },
            "Previous month",
            h,
          ),
          h.h2([h.Class("font-medium")], [format(month, "MMMM yyyy")]),
          button(
            { variant: "outline", onClick: Message.ChangeMonth({ delta: 1 }) },
            "Next month",
            h,
          ),
        ],
      ),
      h.div(
        [h.Class("overflow-x-auto")],
        [
          h.div(
            [
              h.Class(
                "grid grid-cols-7 min-w-[640px] gap-px bg-border border rounded-lg overflow-hidden",
              ),
            ],
            [
              ...["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) =>
                h.div([h.Class("p-2 text-sm bg-muted")], [d]),
              ),
              ...days.map((date) =>
                h.div(
                  [
                    h.Class(
                      `min-h-28 p-2 bg-background ${date.getMonth() === month.getMonth() ? "" : "text-muted-foreground"}`,
                    ),
                  ],
                  [
                    h.p([h.Class("text-sm mb-2")], [String(date.getDate())]),
                    ...(grouped[dayKey(date)] ?? []).map((w) =>
                      h.a(
                        [
                          h.Href(`/workouts/edit/${w.id}`),
                          h.Class(
                            "block rounded bg-secondary p-1 text-xs mb-1",
                          ),
                        ],
                        [
                          format(new Date(w.date), "HH:mm"),
                          " · ",
                          w.tags?.join(", ") || "Workout",
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );
};
