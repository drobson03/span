import type { HtmlBuilder } from "foldkit/html";
import { button } from "../../components/ui/button";
import { input } from "../../components/ui/input";
import { nativeSelect } from "../../components/ui/native-select";
import { textarea } from "../../components/ui/textarea";
import { Message } from "../messages";
import type { Model } from "../model";
import { link, section } from "./shared";

export const formView = (model: Model, h: HtmlBuilder<Message>) =>
  h.form(
    [h.OnSubmit(Message.Submit()), h.Class("max-w-3xl space-y-5")],
    [
      input(
        {
          id: "datetime",
          label: "Date and time",
          type: "datetime-local",
          value: model.draft.datetime,
          onInput: (value) => Message.Field({ field: "datetime", value }),
        },
        h,
      ),
      textarea(
        {
          id: "notes",
          label: "Workout notes",
          value: model.draft.notes,
          onInput: (value) => Message.Field({ field: "notes", value }),
        },
        h,
      ),
      input(
        {
          id: "tags",
          label: "Tags",
          description: "Separate tags with commas",
          value: model.draft.tags,
          onInput: (value) => Message.Field({ field: "tags", value }),
        },
        h,
      ),
      ...model.draft.exercises.map((e, index) =>
        section(h, `Exercise ${index + 1}`, [
          nativeSelect(
            {
              id: `exercise-${index}`,
              label: "Exercise",
              value: e.exerciseTypeId,
              onChange: (value) =>
                Message.ExerciseField({
                  index,
                  field: "exerciseTypeId",
                  value,
                }),
              options: model.exerciseTypes.map((t) =>
                h.option([h.Value(t.id)], [t.name]),
              ),
              wrapperClass: "mb-3",
            },
            h,
          ),
          h.div(
            [h.Class("grid grid-cols-2 gap-3 mb-3")],
            [
              input(
                {
                  id: `weight-${index}`,
                  label: "Weight (kg)",
                  type: "number",
                  step: "any",
                  value: e.weight,
                  onInput: (value) =>
                    Message.ExerciseField({ index, field: "weight", value }),
                },
                h,
              ),
              input(
                {
                  id: `target-${index}`,
                  label: "Target reps",
                  type: "number",
                  value: e.targetReps,
                  onInput: (value) =>
                    Message.ExerciseField({
                      index,
                      field: "targetReps",
                      value,
                    }),
                },
                h,
              ),
            ],
          ),
          textarea(
            {
              id: `exercise-notes-${index}`,
              label: "Exercise notes",
              value: e.notes,
              onInput: (value) =>
                Message.ExerciseField({ index, field: "notes", value }),
            },
            h,
          ),
          h.div(
            [h.Class("grid gap-2 my-3")],
            e.sets.map((reps, set) =>
              h.div(
                [h.Class("flex items-end gap-2")],
                [
                  input(
                    {
                      id: `set-${index}-${set}`,
                      label: `Set ${set + 1} reps`,
                      type: "number",
                      value: reps,
                      onInput: (value) =>
                        Message.SetReps({ index, set, value }),
                    },
                    h,
                  ),
                  button(
                    {
                      variant: "ghost",
                      onClick: Message.RemoveSet({ index, set }),
                    },
                    "Remove set",
                    h,
                  ),
                ],
              ),
            ),
          ),
          h.div(
            [h.Class("flex flex-wrap gap-2")],
            [
              button(
                { variant: "outline", onClick: Message.AddSet({ index }) },
                "Add set",
                h,
              ),
              button(
                {
                  variant: "outline",
                  isDisabled: index === 0,
                  onClick: Message.MoveExercise({ index, delta: -1 }),
                },
                "Move up",
                h,
              ),
              button(
                {
                  variant: "outline",
                  isDisabled: index === model.draft.exercises.length - 1,
                  onClick: Message.MoveExercise({ index, delta: 1 }),
                },
                "Move down",
                h,
              ),
              button(
                {
                  variant: "ghost",
                  onClick: Message.RemoveExercise({ index }),
                },
                "Remove exercise",
                h,
              ),
            ],
          ),
        ]),
      ),
      h.div(
        [h.Class("flex flex-wrap items-center gap-3")],
        [
          button(
            {
              variant: "outline",
              onClick: Message.AddExercise(),
              isDisabled: model.exerciseTypes.length === 0 || model.busy,
            },
            "Add exercise",
            h,
          ),
          button(
            { type: "submit", isDisabled: model.busy },
            model.busy ? "Saving…" : "Save workout",
            h,
          ),
          link(h, "/workouts", "Cancel"),
        ],
      ),
      ...(model.exerciseTypes.length
        ? []
        : [
            h.p(
              [h.Class("text-sm text-muted-foreground")],
              [
                "No exercise types are configured. You can still save a workout with notes and tags.",
              ],
            ),
          ]),
    ],
  );
