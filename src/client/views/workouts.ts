import { format } from "date-fns";
import type { HtmlBuilder } from "foldkit/html";
import { badge } from "../../components/ui/badge";
import { button } from "../../components/ui/button";
import { filterWorkouts } from "../../shared/analytics";
import type { Workout } from "../../shared/workouts";
import { Message } from "../messages";
import type { Model } from "../model";
import { link, section } from "./shared";

const workoutCard = (w: Workout, h: HtmlBuilder<Message>) =>
  section(h, format(new Date(w.date), "EEE, d MMM yyyy · HH:mm"), [
    h.div(
      [h.Class("flex flex-wrap gap-1 mb-3")],
      (w.tags ?? []).map((tag) => badge({ variant: "secondary" }, [tag], h)),
    ),
    ...w.exercises.map((e) =>
      h.div(
        [h.Class("mb-3")],
        [
          h.p([h.Class("font-medium")], [e.exerciseType.name]),
          h.p(
            [h.Class("text-sm text-muted-foreground")],
            [
              `${e.weight} kg · target ${e.targetReps} reps · sets ${e.sets.map((s) => s.reps).join(", ") || "none"}`,
            ],
          ),
          ...(e.notes
            ? [h.p([h.Class("text-sm whitespace-pre-wrap")], [e.notes])]
            : []),
        ],
      ),
    ),
    ...(w.notes
      ? [h.p([h.Class("text-sm whitespace-pre-wrap mb-3")], [w.notes])]
      : []),
    h.div(
      [h.Class("flex items-center gap-4")],
      [
        link(h, `/workouts/edit/${w.id}`, "Edit"),
        button(
          { variant: "ghost", onClick: Message.AskDelete({ id: w.id }) },
          "Delete",
          h,
        ),
      ],
    ),
  ]);
export const workoutsView = (model: Model, h: HtmlBuilder<Message>) => {
  const tags = [...new Set(model.workouts.flatMap((w) => w.tags ?? []))].sort();
  const filtered = filterWorkouts(model.workouts, model.tags);
  return h.div(
    [h.Class("space-y-5")],
    [
      h.div(
        [h.Class("flex flex-wrap gap-2")],
        tags.map((tag) =>
          button(
            {
              variant: model.tags.includes(tag) ? "default" : "outline",
              onClick: Message.ToggleTag({ tag }),
            },
            tag,
            h,
          ),
        ),
      ),
      ...(filtered.length
        ? [
            h.div(
              [h.Class("grid gap-4 md:grid-cols-2 xl:grid-cols-3")],
              filtered.map((w) => workoutCard(w, h)),
            ),
          ]
        : [
            h.p(
              [h.Class("text-muted-foreground")],
              ["No workouts here yet. Add a workout or change your filters."],
            ),
          ]),
    ],
  );
};
