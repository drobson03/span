import { addMonths, format } from "date-fns";
import { Match, Option, Predicate } from "effect";
import type { Update } from "foldkit";
import { toString as urlToString } from "foldkit/url";
import {
  Delete,
  External,
  LoadData,
  Navigate,
  Register,
  Save,
  SignIn,
  SignOut,
} from "./commands";
import { blankDraft, editDraft } from "./draft";
import { calendarMonth } from "./init";
import type { Message } from "./messages";
import type { Model } from "./model";
import { draftOptic, exerciseAt, exercisesOptic } from "./optics";

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      ClickedLink: (message): Update.Return<Model, Message> => ({
        model,
        commands: [
          Predicate.isTagged(message.request, "Internal")
            ? Navigate({ url: urlToString(message.request.url) })
            : External({ url: message.request.href }),
        ],
      }),
      ChangedUrl: (message): Update.Return<Model, Message> => ({
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
      }),
      Loaded: (message): Update.Return<Model, Message> => ({
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
      }),
      Failed: (message): Update.Return<Model, Message> => ({
        model: {
          ...model,
          loading: false,
          busy: false,
          error: message.error,
        },
      }),
      SignIn: (message): Update.Return<Model, Message> =>
        model.busy
          ? { model }
          : {
              model: { ...model, busy: true, error: "" },
              commands: [SignIn()],
            },
      SignOut: (message): Update.Return<Model, Message> => ({
        model: { ...model, busy: true },
        commands: [SignOut()],
      }),
      SignedOut: (message): Update.Return<Model, Message> => ({
        model: {
          ...model,
          session: null,
          workouts: [],
          exerciseTypes: [],
          busy: false,
        },
        commands: [Navigate({ url: "/login" })],
      }),
      Retry: (message): Update.Return<Model, Message> => ({
        model: { ...model, loading: true, error: "" },
        commands: [LoadData()],
      }),
      Submit: (message): Update.Return<Model, Message> =>
        model.busy
          ? { model }
          : {
              model: { ...model, busy: true, error: "" },
              commands: [Save({ draft: model.draft })],
            },
      Saved: (message): Update.Return<Model, Message> => ({
        model: { ...model, busy: false, draft: blankDraft(), loading: true },
        commands: [Navigate({ url: "/workouts" }), LoadData()],
      }),
      Field: (message): Update.Return<Model, Message> => ({
        model: draftOptic.key(message.field).replace(message.value, model),
      }),
      AddExercise: (message): Update.Return<Model, Message> => ({
        model: exercisesOptic.modify((exercises) => [
          ...exercises,
          {
            exerciseTypeId: model.exerciseTypes[0]?.id ?? "",
            weight: "0",
            targetReps: "8",
            notes: "",
            sets: ["8"],
          },
        ])(model),
      }),
      SetMetric: (message): Update.Return<Model, Message> => ({
        model: { ...model, metric: message.metric },
      }),
      MoveExercise: (message): Update.Return<Model, Message> => {
        const exercises = [...model.draft.exercises];
        const target = message.index + message.delta;
        if (
          message.index < 0 ||
          message.index >= exercises.length ||
          target < 0 ||
          target >= exercises.length
        ) {
          return { model };
        }
        const [exercise] = exercises.splice(message.index, 1);
        exercises.splice(target, 0, exercise!);
        return { model: exercisesOptic.replace(exercises, model) };
      },
      RemoveExercise: (message): Update.Return<Model, Message> => ({
        model: exercisesOptic.modify((exercises) =>
          exercises.filter((_, index) => index !== message.index),
        )(model),
      }),
      ToggleTag: (message): Update.Return<Model, Message> => ({
        model: {
          ...model,
          tags: model.tags.includes(message.tag)
            ? model.tags.filter((t) => t !== message.tag)
            : [...model.tags, message.tag],
        },
      }),
      ChangeMonth: (message): Update.Return<Model, Message> => ({
        model: {
          ...model,
          month: format(
            addMonths(new Date(model.month), message.delta),
            "yyyy-MM-01",
          ),
        },
      }),
      AskDelete: (message): Update.Return<Model, Message> => ({
        model: { ...model, deleteId: message.id },
      }),
      CancelDelete: (message): Update.Return<Model, Message> => ({
        model: { ...model, deleteId: null },
      }),
      ConfirmDelete: (message): Update.Return<Model, Message> =>
        model.deleteId && !model.busy
          ? {
              model: { ...model, busy: true },
              commands: [Delete({ id: model.deleteId })],
            }
          : { model },
      Deleted: (message): Update.Return<Model, Message> => ({
        model: { ...model, deleteId: null, busy: false, loading: true },
        commands: [LoadData()],
      }),
      RegistrationName: (message): Update.Return<Model, Message> => ({
        model: { ...model, registrationName: message.value },
      }),
      Register: (message): Update.Return<Model, Message> =>
        model.busy
          ? { model }
          : {
              model: { ...model, busy: true },
              commands: [
                Register({
                  name: model.registrationName,
                  search: model.search,
                }),
              ],
            },
      Registered: (message): Update.Return<Model, Message> => ({
        model: { ...model, busy: false, path: "/login" },
        commands: [Navigate({ url: "/login" })],
      }),
      Navigated: (message): Update.Return<Model, Message> => ({ model }),
      ExerciseField: (message): Update.Return<Model, Message> => ({
        model: exerciseAt(message.index)
          .key(message.field)
          .replace(message.value, model),
      }),
      AddSet: (message): Update.Return<Model, Message> => ({
        model: exerciseAt(message.index).modify((exercise) => ({
          ...exercise,
          sets: [...exercise.sets, exercise.targetReps],
        }))(model),
      }),
      RemoveSet: (message): Update.Return<Model, Message> => ({
        model: exerciseAt(message.index)
          .key("sets")
          .modify((sets) => sets.filter((_, index) => index !== message.set))(
          model,
        ),
      }),
      SetReps: (message): Update.Return<Model, Message> => ({
        model: exerciseAt(message.index)
          .key("sets")
          .at(message.set)
          .replace(message.value, model),
      }),
    }),
  );
