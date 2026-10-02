import type { Document, HtmlBuilder } from "foldkit/html";
import { button } from "../components/ui/button";
import { editDraft } from "./draft";
import { Message } from "./messages";
import type { Model } from "./model";
import { analyticsView } from "./views/analytics";
import { loginView, registrationView } from "./views/auth";
import { calendarView } from "./views/calendar";
import { heatmap } from "./views/heatmap";
import { link, section } from "./views/shared";
import { formView } from "./views/workout-form";
import { workoutsView } from "./views/workouts";

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const editing = model.path.startsWith("/workouts/edit/");
  const title =
    model.path === "/workouts/new"
      ? "New workout"
      : editing
        ? "Edit workout"
        : model.path.startsWith("/calendar")
          ? "Calendar"
          : model.path === "/analytics"
            ? "Analytics"
            : model.path === "/workouts"
              ? "Workouts"
              : "Dashboard";
  const errorView = model.error
    ? h.div(
        [
          h.Class("border border-destructive rounded-lg p-3 mb-4 text-sm"),
          h.Role("alert"),
        ],
        [
          model.error,
          " ",
          button({ variant: "link", onClick: Message.Retry() }, "Retry", h),
        ],
      )
    : h.empty;
  const content = model.loading
    ? h.p([h.Role("status")], ["Loading…"])
    : model.path === "/workouts/new" || editing
      ? editing && !editDraft(model.workouts, model.path)
        ? h.p([], ["Workout not found."])
        : formView(model, h)
      : model.path === "/workouts"
        ? workoutsView(model, h)
        : model.path.startsWith("/calendar")
          ? calendarView(model, h)
          : model.path === "/analytics"
            ? analyticsView(model, h)
            : model.path === "/"
              ? heatmap(model, h)
              : h.p([], ["Page not found."]);
  const app = h.div(
    [h.Class("min-h-screen md:grid md:grid-cols-[220px_1fr]")],
    [
      h.aside(
        [h.Class("border-b md:border-b-0 md:border-r p-5 flex flex-col gap-6")],
        [
          h.a(
            [h.Href("/"), h.Class("text-2xl font-semibold tracking-tight")],
            ["Span"],
          ),
          h.nav(
            [
              h.Class("flex flex-wrap md:flex-col gap-2"),
              h.AriaLabel("Main navigation"),
            ],
            [
              ["/", "Dashboard"],
              ["/workouts", "Workouts"],
              ["/calendar", "Calendar"],
              ["/analytics", "Analytics"],
            ].map(([href, label]) =>
              h.a(
                [
                  h.Href(href!),
                  h.Class(
                    `rounded-lg px-3 py-2 text-sm ${model.path === href ? "bg-secondary font-medium" : "hover:bg-muted"}`,
                  ),
                ],
                [label!],
              ),
            ),
          ),
          h.div(
            [h.Class("md:mt-auto space-y-3")],
            [
              h.p([h.Class("text-sm")], [model.session?.displayName ?? ""]),
              button(
                {
                  variant: "outline",
                  onClick: Message.SignOut(),
                  isDisabled: model.busy,
                },
                "Sign out",
                h,
              ),
            ],
          ),
        ],
      ),
      h.main(
        [h.Class("p-5 md:p-8 space-y-5 min-w-0")],
        [
          h.header(
            [h.Class("flex justify-between items-center gap-4")],
            [
              h.h1([h.Class("text-2xl font-semibold")], [title]),
              link(h, "/workouts/new", "+ New workout"),
            ],
          ),
          errorView,
          content,
          ...(model.deleteId
            ? [
                section(h, "Delete this workout?", [
                  h.p(
                    [h.Class("mb-3")],
                    ["This also deletes its exercises and sets."],
                  ),
                  h.div(
                    [h.Class("flex gap-2")],
                    [
                      button(
                        {
                          variant: "destructive",
                          isDisabled: model.busy,
                          onClick: Message.ConfirmDelete(),
                        },
                        "Delete workout",
                        h,
                      ),
                      button(
                        {
                          variant: "outline",
                          isDisabled: model.busy,
                          onClick: Message.CancelDelete(),
                        },
                        "Cancel",
                        h,
                      ),
                    ],
                  ),
                ]),
              ]
            : []),
        ],
      ),
    ],
  );
  return {
    title: `${title} · Span`,
    body:
      model.path === "/register"
        ? registrationView(model, h, errorView)
        : model.loading && !model.session
          ? h.main([h.Class("p-8"), h.Role("status")], ["Loading Span…"])
          : !model.session
            ? loginView(model, h, errorView)
            : app,
  };
};
