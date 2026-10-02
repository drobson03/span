import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { Command, type Runtime, type Update } from "foldkit";
import type { Document, Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { load, pushUrl, UrlRequest } from "foldkit/navigation";
import { Url, toString as urlToString } from "foldkit/url";
import { AppClient, request } from "./client";
import { badge } from "./components/ui/badge";
import { button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { input } from "./components/ui/input";
import { nativeSelect } from "./components/ui/native-select";
import { Table } from "./components/ui/table";
import { textarea } from "./components/ui/textarea";
import {
  dayKey,
  filterWorkouts,
  progression,
  workoutsByDay,
} from "./shared/analytics";
import { Claims } from "./shared/auth";
import {
  ExerciseTypeList,
  type Workout,
  WorkoutInput,
  WorkoutList,
} from "./shared/workouts";

const DraftExercise = Schema.Struct({
  exerciseTypeId: Schema.String,
  weight: Schema.String,
  targetReps: Schema.String,
  notes: Schema.String,
  sets: Schema.Array(Schema.String),
});
const Draft = Schema.Struct({
  id: Schema.NullOr(Schema.String),
  datetime: Schema.String,
  notes: Schema.String,
  tags: Schema.String,
  exercises: Schema.Array(DraftExercise),
});
export const Model = Schema.Struct({
  path: Schema.String,
  search: Schema.String,
  session: Schema.NullOr(Claims),
  workouts: WorkoutList,
  exerciseTypes: ExerciseTypeList,
  draft: Draft,
  tags: Schema.Array(Schema.String),
  metric: Schema.Literals(["maxWeight", "volume", "reps"]),
  month: Schema.String,
  loading: Schema.Boolean,
  busy: Schema.Boolean,
  error: Schema.String,
  registrationName: Schema.String,
  deleteId: Schema.NullOr(Schema.String),
});
export type Model = typeof Model.Type;
export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  Navigated: {},
  Loaded: {
    session: Schema.NullOr(Claims),
    workouts: WorkoutList,
    exerciseTypes: ExerciseTypeList,
  },
  Failed: { error: Schema.String },
  SignedOut: {},
  Saved: {},
  Deleted: {},
  Registered: {},
  SignIn: {},
  SignOut: {},
  Retry: {},
  Submit: {},
  Register: {},
  RegistrationName: { value: Schema.String },
  Field: {
    field: Schema.Literals(["datetime", "notes", "tags"]),
    value: Schema.String,
  },
  AddExercise: {},
  RemoveExercise: { index: Schema.Int },
  MoveExercise: { index: Schema.Int, delta: Schema.Int },
  SetMetric: { metric: Schema.Literals(["maxWeight", "volume", "reps"]) },
  AddSet: { index: Schema.Int },
  RemoveSet: { index: Schema.Int, set: Schema.Int },
  ExerciseField: {
    index: Schema.Int,
    field: Schema.Literals(["exerciseTypeId", "weight", "targetReps", "notes"]),
    value: Schema.String,
  },
  SetReps: { index: Schema.Int, set: Schema.Int, value: Schema.String },
  ToggleTag: { tag: Schema.String },
  ChangeMonth: { delta: Schema.Int },
  AskDelete: { id: Schema.String },
  CancelDelete: {},
  ConfirmDelete: {},
});
export type Message = typeof Message.Type;
const blankDraft = (): typeof Draft.Type => ({
  id: null,
  datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  notes: "",
  tags: "",
  exercises: [],
});
const Navigate = Command.define("Navigate", {
  args: { url: Schema.String },
  messages: [Message.Navigated],
  execute: ({ url }) => pushUrl(url).pipe(Effect.as(Message.Navigated())),
});
const External = Command.define("External", {
  args: { url: Schema.String },
  messages: [Message.Navigated],
  execute: ({ url }) => load(url).pipe(Effect.as(Message.Navigated())),
});
const failed = (error: unknown) =>
  Message.Failed({
    error:
      error instanceof Error
        ? error.message
        : "Request failed. Please try again.",
  });
export const LoadData = Command.define("LoadData", {
  messages: [Message.Loaded, Message.Failed],
  execute: Effect.gen(function* () {
    const client = yield* AppClient;
    const session = yield* client.auth.getSession();
    if (!session)
      return Message.Loaded({ session: null, workouts: [], exerciseTypes: [] });
    const [workouts, exerciseTypes] = yield* Effect.all(
      [
        request("/api/workouts").pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(WorkoutList)),
        ),
        request("/api/exercise-types").pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(ExerciseTypeList)),
        ),
      ],
      { concurrency: "unbounded" },
    );
    return Message.Loaded({ session: session.claims, workouts, exerciseTypes });
  }).pipe(
    Effect.provide(AppClient.layer.pipe(Layer.provide(FetchHttpClient.layer))),
    Effect.catch((error) => Effect.succeed(failed(error))),
  ),
});
const SignIn = Command.define("SignIn", {
  messages: [Message.Navigated, Message.Failed],
  execute: Effect.gen(function* () {
    const client = yield* AppClient;
    const started = yield* client.auth.signIn({
      provider: "google",
      returnTarget: "/",
    });
    yield* load(Redacted.value(started.authorizationUrl));
    return Message.Navigated();
  }).pipe(
    Effect.provide(AppClient.layer.pipe(Layer.provide(FetchHttpClient.layer))),
    Effect.catch((error) => Effect.succeed(failed(error))),
  ),
});
const SignOut = Command.define("SignOut", {
  messages: [Message.SignedOut, Message.Failed],
  execute: Effect.gen(function* () {
    const client = yield* AppClient;
    yield* client.auth.signOut();
    return Message.SignedOut();
  }).pipe(
    Effect.provide(AppClient.layer.pipe(Layer.provide(FetchHttpClient.layer))),
    Effect.catch((error) => Effect.succeed(failed(error))),
  ),
});
export const draftToInput = (draft: typeof Draft.Type) =>
  Schema.decodeUnknownSync(WorkoutInput)({
    datetime: new Date(draft.datetime).toISOString(),
    notes: draft.notes,
    tags: [
      ...new Set(
        draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ],
    exercises: draft.exercises.map((e) => ({
      exerciseTypeId: e.exerciseTypeId,
      weight: e.weight.trim() ? Number(e.weight) : NaN,
      targetReps: e.targetReps.trim() ? Number(e.targetReps) : NaN,
      notes: e.notes,
      sets: e.sets.map((reps) => ({ reps: reps.trim() ? Number(reps) : NaN })),
    })),
  });
const Save = Command.define("Save", {
  args: { draft: Draft },
  messages: [Message.Saved, Message.Failed],
  execute: ({ draft }) =>
    Effect.try({
      try: () => draftToInput(draft),
      catch: () =>
        new Error(
          "Enter a valid date, exercise, non-negative weight, and whole-number reps.",
        ),
    }).pipe(
      Effect.flatMap((data) =>
        request(
          draft.id
            ? `/api/workouts/${encodeURIComponent(draft.id)}`
            : "/api/workouts",
          draft.id ? "PUT" : "POST",
          data,
        ),
      ),
      Effect.as(Message.Saved()),
      Effect.catch((error) => Effect.succeed(failed(error))),
    ),
});
const Delete = Command.define("Delete", {
  args: { id: Schema.String },
  messages: [Message.Deleted, Message.Failed],
  execute: ({ id }) =>
    request(`/api/workouts/${encodeURIComponent(id)}`, "DELETE").pipe(
      Effect.as(Message.Deleted()),
      Effect.catch((error) => Effect.succeed(failed(error))),
    ),
});
const Register = Command.define("Register", {
  args: { name: Schema.String, search: Schema.String },
  messages: [Message.Registered, Message.Failed],
  execute: ({ name, search }) =>
    Effect.gen(function* () {
      const params = new URLSearchParams(search);
      const client = yield* AppClient;
      yield* client.auth.register({
        reference: params.get("reference")!,
        flowId: params.get("flowId")!,
        commandId: crypto.randomUUID(),
        registration: { displayName: name.trim() },
      });
      return Message.Registered();
    }).pipe(
      Effect.provide(
        AppClient.layer.pipe(Layer.provide(FetchHttpClient.layer)),
      ),
      Effect.catch((error) => Effect.succeed(failed(error))),
    ),
});
const editDraft = (
  workouts: readonly Workout[],
  path: string,
): typeof Draft.Type | null => {
  const match = /^\/workouts\/edit\/([^/]+)$/.exec(path);
  if (!match) return null;
  const w = workouts.find((w) => w.id === decodeURIComponent(match[1]!));
  if (!w) return null;
  return {
    id: w.id,
    datetime: format(new Date(w.date), "yyyy-MM-dd'T'HH:mm"),
    notes: w.notes ?? "",
    tags: w.tags?.join(", ") ?? "",
    exercises: w.exercises.map((e) => ({
      exerciseTypeId: e.exerciseTypeId,
      weight: String(e.weight),
      targetReps: String(e.targetReps),
      notes: e.notes ?? "",
      sets: e.sets.map((s) => String(s.reps)),
    })),
  };
};
const calendarMonth = (path: string) => {
  const match = /^\/calendar\/(\d{4})\/(\d{1,2})$/.exec(path);
  if (
    match &&
    Number(match[2]) >= 1 &&
    Number(match[2]) <= 12 &&
    Number(match[1]) >= 1000
  )
    return `${match[1]}-${match[2]!.padStart(2, "0")}-01`;
  return format(new Date(), "yyyy-MM-01");
};
export const init: Runtime.RoutingApplicationInit<Model, Message> = (url) => ({
  model: {
    path: url.pathname,
    search: Option.getOrElse(url.search, () => ""),
    session: null,
    workouts: [],
    exerciseTypes: [],
    draft: blankDraft(),
    tags: [],
    metric: "maxWeight",
    month: calendarMonth(url.pathname),
    loading: true,
    busy: false,
    error: "",
    registrationName: "",
    deleteId: null,
  },
  commands: [LoadData()],
});
export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case "ClickedLink":
      return {
        model,
        commands: [
          message.request._tag === "Internal"
            ? Navigate({ url: urlToString(message.request.url) })
            : External({ url: message.request.href }),
        ],
      };
    case "ChangedUrl":
      return {
        model: {
          ...model,
          path: message.url.pathname,
          month:
            model.path === message.url.pathname
              ? model.month
              : calendarMonth(message.url.pathname),
          search: Option.getOrElse(message.url.search, () => ""),
          error: "",
          draft:
            editDraft(model.workouts, message.url.pathname) ??
            (message.url.pathname === "/workouts/new"
              ? blankDraft()
              : model.draft),
        },
      };
    case "Loaded":
      return {
        model: {
          ...model,
          session: message.session,
          workouts: message.workouts,
          exerciseTypes: message.exerciseTypes,
          loading: false,
          busy: false,
          error: "",
          draft: editDraft(message.workouts, model.path) ?? model.draft,
        },
      };
    case "Failed":
      return {
        model: { ...model, loading: false, busy: false, error: message.error },
      };
    case "SignIn":
      return model.busy
        ? { model }
        : { model: { ...model, busy: true, error: "" }, commands: [SignIn()] };
    case "SignOut":
      return { model: { ...model, busy: true }, commands: [SignOut()] };
    case "SignedOut":
      return {
        model: {
          ...model,
          session: null,
          workouts: [],
          exerciseTypes: [],
          busy: false,
        },
        commands: [Navigate({ url: "/login" })],
      };
    case "Retry":
      return {
        model: { ...model, loading: true, error: "" },
        commands: [LoadData()],
      };
    case "Submit":
      return model.busy
        ? { model }
        : {
            model: { ...model, busy: true, error: "" },
            commands: [Save({ draft: model.draft })],
          };
    case "Saved":
      return {
        model: { ...model, busy: false, draft: blankDraft(), loading: true },
        commands: [Navigate({ url: "/workouts" }), LoadData()],
      };
    case "Field":
      return {
        model: {
          ...model,
          draft: { ...model.draft, [message.field]: message.value },
        },
      };
    case "AddExercise":
      return {
        model: {
          ...model,
          draft: {
            ...model.draft,
            exercises: [
              ...model.draft.exercises,
              {
                exerciseTypeId: model.exerciseTypes[0]?.id ?? "",
                weight: "0",
                targetReps: "8",
                notes: "",
                sets: ["8"],
              },
            ],
          },
        },
      };
    case "SetMetric":
      return { model: { ...model, metric: message.metric } };
    case "MoveExercise": {
      const exercises = [...model.draft.exercises];
      const target = message.index + message.delta;
      if (
        message.index < 0 ||
        message.index >= exercises.length ||
        target < 0 ||
        target >= exercises.length
      )
        return { model };
      const [exercise] = exercises.splice(message.index, 1);
      exercises.splice(target, 0, exercise!);
      return { model: { ...model, draft: { ...model.draft, exercises } } };
    }
    case "RemoveExercise":
      return {
        model: {
          ...model,
          draft: {
            ...model.draft,
            exercises: model.draft.exercises.filter(
              (_, i) => i !== message.index,
            ),
          },
        },
      };
    case "ExerciseField":
    case "AddSet":
    case "RemoveSet":
    case "SetReps":
      return {
        model: {
          ...model,
          draft: {
            ...model.draft,
            exercises: model.draft.exercises.map((e, i) =>
              i !== message.index
                ? e
                : message._tag === "ExerciseField"
                  ? { ...e, [message.field]: message.value }
                  : {
                      ...e,
                      sets:
                        message._tag === "AddSet"
                          ? [...e.sets, e.targetReps]
                          : message._tag === "RemoveSet"
                            ? e.sets.filter((_, i) => i !== message.set)
                            : e.sets.map((r, i) =>
                                i === message.set ? message.value : r,
                              ),
                    },
            ),
          },
        },
      };
    case "ToggleTag":
      return {
        model: {
          ...model,
          tags: model.tags.includes(message.tag)
            ? model.tags.filter((t) => t !== message.tag)
            : [...model.tags, message.tag],
        },
      };
    case "ChangeMonth":
      return {
        model: {
          ...model,
          month: format(
            addMonths(new Date(model.month), message.delta),
            "yyyy-MM-01",
          ),
        },
      };
    case "AskDelete":
      return { model: { ...model, deleteId: message.id } };
    case "CancelDelete":
      return { model: { ...model, deleteId: null } };
    case "ConfirmDelete":
      return model.deleteId && !model.busy
        ? {
            model: { ...model, busy: true },
            commands: [Delete({ id: model.deleteId })],
          }
        : { model };
    case "Deleted":
      return {
        model: { ...model, deleteId: null, busy: false, loading: true },
        commands: [LoadData()],
      };
    case "RegistrationName":
      return { model: { ...model, registrationName: message.value } };
    case "Register":
      return model.busy
        ? { model }
        : {
            model: { ...model, busy: true },
            commands: [
              Register({ name: model.registrationName, search: model.search }),
            ],
          };
    case "Registered":
      return {
        model: { ...model, busy: false, path: "/login" },
        commands: [Navigate({ url: "/login" })],
      };
    case "Navigated":
      return { model };
  }
};

const link = (h: HtmlBuilder<Message>, href: string, text: string) =>
  h.a([h.Href(href), h.Class("text-sm underline underline-offset-4")], [text]);
const section = (
  h: HtmlBuilder<Message>,
  title: string,
  children: (Html | string)[],
) =>
  Card(
    {},
    [
      Card.header({}, [Card.title({}, [title], h)], h),
      Card.content({}, children, h),
    ],
    h,
  );
const heatmap = (model: Model, h: HtmlBuilder<Message>) => {
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
const workoutsView = (model: Model, h: HtmlBuilder<Message>) => {
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
const formView = (model: Model, h: HtmlBuilder<Message>) =>
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
const calendarView = (model: Model, h: HtmlBuilder<Message>) => {
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
const metricLabels = {
  maxWeight: "Max weight",
  volume: "Total volume",
  reps: "Total reps",
} as const;
const analyticsView = (model: Model, h: HtmlBuilder<Message>) =>
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
  const login = h.main(
    [h.Class("min-h-screen grid place-items-center p-6")],
    [
      h.div(
        [h.Class("w-full max-w-sm")],
        [
          section(h, "Span", [
            h.p(
              [h.Class("text-muted-foreground mb-5")],
              ["Track your workouts. Build consistency. See your progress."],
            ),
            errorView,
            button(
              { onClick: Message.SignIn(), isDisabled: model.busy },
              model.busy ? "Connecting…" : "Continue with Google",
              h,
            ),
          ]),
        ],
      ),
    ],
  );
  const registration = h.main(
    [h.Class("min-h-screen grid place-items-center p-6")],
    [
      h.div(
        [h.Class("w-full max-w-sm")],
        [
          section(h, "Finish setting up Span", [
            h.p(
              [h.Class("mb-4 text-muted-foreground")],
              [
                "Choose the name shown on your account. Then sign in to start tracking.",
              ],
            ),
            errorView,
            h.form(
              [h.OnSubmit(Message.Register()), h.Class("space-y-4")],
              [
                input(
                  {
                    id: "registration-name",
                    label: "Your name",
                    value: model.registrationName,
                    onInput: (value) => Message.RegistrationName({ value }),
                  },
                  h,
                ),
                button(
                  {
                    type: "submit",
                    isDisabled: model.busy || !model.registrationName.trim(),
                  },
                  model.busy ? "Creating account…" : "Create account",
                  h,
                ),
              ],
            ),
          ]),
        ],
      ),
    ],
  );
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
        ? registration
        : model.loading && !model.session
          ? h.main([h.Class("p-8"), h.Role("status")], ["Loading Span…"])
          : !model.session
            ? login
            : app,
  };
};
