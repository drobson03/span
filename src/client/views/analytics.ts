import type { HtmlBuilder } from "foldkit/html";
import { button } from "../../components/ui/button";
import { Table } from "../../components/ui/table";
import { progression } from "../../shared/analytics";
import { Message } from "../messages";
import type { Model } from "../model";
import { heatmap } from "./heatmap";
import { section } from "./shared";

const metricLabels = {
  maxWeight: "Max weight",
  volume: "Total volume",
  reps: "Total reps",
} as const;
export const analyticsView = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [h.Class("space-y-5")],
    [
      heatmap(model, h),
      h.div(
        [h.Class("flex flex-wrap gap-2"), h.AriaLabel("Chart metric")],
        (["maxWeight", "volume", "reps"] as const).map((metric) =>
          button(
            {
              variant: model.metric === metric ? "default" : "outline",
              onClick: Message.SetMetric({ metric }),
              attributes: [h.AriaPressed(String(model.metric === metric))],
            },
            metricLabels[metric],
            h,
          ),
        ),
      ),
      ...progression(model.workouts).map((group) =>
        section(h, group.name, [
          Table(
            { className: "text-left" },
            [
              Table.header(
                {},
                [
                  Table.row(
                    {},
                    [
                      "Date",
                      "Max weight (kg)",
                      "Volume (kg)",
                      "Reps",
                      "Sets",
                    ].map((label) => Table.head({}, [label], h)),
                    h,
                  ),
                ],
                h,
              ),
              Table.body(
                {},
                group.data.map((point) =>
                  Table.row(
                    {},
                    [
                      point.date,
                      String(point.maxWeight),
                      String(point.volume),
                      String(point.reps),
                      String(point.sets),
                    ].map((value) => Table.cell({}, [value], h)),
                    h,
                  ),
                ),
                h,
              ),
            ],
            h,
          ),
          h.div(
            [
              h.Class("flex items-end gap-1 h-24 mt-4"),
              h.AriaLabel(
                `${group.name} ${metricLabels[model.metric].toLowerCase()} over time`,
              ),
            ],
            group.data.map((p) =>
              h.div([
                h.Class("flex-1 bg-primary rounded-t min-w-1"),
                h.Style({
                  height: `${Math.max(2, (p[model.metric] / Math.max(1, ...group.data.map((p) => p[model.metric]))) * 100)}%`,
                }),
                h.Title(
                  `${p.date}: ${p[model.metric]} ${model.metric === "reps" ? "reps" : "kg"}`,
                ),
              ]),
            ),
          ),
        ]),
      ),
      ...(model.workouts.some((w) => w.exercises.length)
        ? []
        : [
            h.p(
              [h.Class("text-muted-foreground")],
              ["Log exercises to see your progression."],
            ),
          ]),
    ],
  );
