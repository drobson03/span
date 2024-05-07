import {
  action,
  cache,
  createAsync,
  redirect,
  useAction,
} from "@solidjs/router";
import { type FieldApi } from "@tanstack/solid-form/src/index";
import { createForm } from "@tanstack/solid-form/src/createForm";
import { valibotValidator } from "@tanstack/valibot-form-adapter";
import dayjs from "dayjs";
import { Index, Show } from "solid-js";
import {
  maxLength,
  number,
  string,
  minValue,
  coerce,
  object,
  array,
  Input,
  parse,
} from "valibot";
import { db } from "~/server/db";
import { exercise, set, workout as workoutTable } from "~/server/schema";
import { getAuthenticatedUser } from "~/server/utils";

const getExerciseTypes = cache(async () => {
  "use server";
  return db.query.exerciseType.findMany();
}, "exercise-types");

const WorkoutFormDataSchema = object({
  datetime: string(),
  notes: string([maxLength(1000)]),
  exercises: array(
    object({
      exerciseTypeId: string(),
      weight: string(),
      targetReps: number([minValue(0)]),
      notes: string([maxLength(1000)]),
      sets: array(number([minValue(0)])),
    }),
  ),
});

type WorkoutFormData = Input<typeof WorkoutFormDataSchema>;

const createWorkout = action(async (w: unknown) => {
  "use server";
  const workout = parse(WorkoutFormDataSchema, w);

  const user = await getAuthenticatedUser();
  const [{ workoutId }] = await db
    .insert(workoutTable)
    .values({
      userId: user.id,
      date: new Date(workout.datetime),
      notes: workout.notes.length > 0 ? workout.notes : null,
    })
    .returning({ workoutId: workoutTable.id });

  if (workout.exercises.length === 0) {
    return redirect("/workouts");
  }

  const exercises = await db
    .insert(exercise)
    .values(
      workout.exercises.map((exercise) => ({
        workoutId,
        exerciseTypeId: exercise.exerciseTypeId,
        weight: parseFloat(exercise.weight),
        targetReps: exercise.targetReps,
        notes: exercise.notes.length > 0 ? exercise.notes : null,
        sets: exercise.sets,
      })),
    )
    .returning({ id: exercise.id });

  if (exercises.length === 0) {
    return redirect("/workouts");
  }

  await db
    .insert(set)
    .values(
      workout.exercises.flatMap((exercise, i) =>
        exercise.sets.map((reps) => ({
          exerciseId: exercises[i].id,
          reps,
        })),
      ),
    )
    .returning({ id: set.id });

  return redirect("/workouts");
});

function FieldInfo(props: { field: FieldApi<any, any, any, any> }) {
  return (
    <Show when={props.field.state.meta.touchedErrors}>
      <em>{props.field.state.meta.touchedErrors}</em>
    </Show>
  );
}

export default function WorkoutForm() {
  const submit = useAction(createWorkout);
  const exerciseTypes = createAsync(() => getExerciseTypes());
  const form = createForm(() => ({
    defaultValues: {
      datetime: dayjs().format("YYYY-MM-DD[T]HH:mm"),
      notes: "",
      exercises: [],
    } satisfies WorkoutFormData as WorkoutFormData,
    onSubmit: async ({ value }) => {
      submit({
        ...value,
        datetime: dayjs(value.datetime, "YYYY-MM-DD[T]HH:mm").toISOString(),
      });
    },
    validatorAdapter: valibotValidator,
  }));

  return (
    <form
      class="flex flex-col gap-[0.0625rem] border-b bg-gray-200 md:grid md:grid-cols-4 md:place-items-stretch"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div class="col-span-4 grid grid-cols-3 place-items-stretch gap-4 bg-white p-4 md:px-6">
        <form.Field
          name="datetime"
          children={(datetimeField) => {
            return (
              <>
                <div class="flex flex-col gap-2">
                  <label for={datetimeField().name}>Date &amp; Time</label>
                  <FieldInfo field={datetimeField()} />
                </div>
                <input
                  class="col-span-2 border-gray-200 focus:border-black focus:ring-black"
                  id={datetimeField().name}
                  name={datetimeField().name}
                  value={datetimeField().state.value}
                  type="datetime-local"
                  onBlur={datetimeField().handleBlur}
                  onInput={(e) => datetimeField().handleChange(e.target.value)}
                />
              </>
            );
          }}
        />
        <form.Field
          name="notes"
          validators={{
            onChange: string([maxLength(1000)]),
          }}
          children={(notesField) => {
            return (
              <>
                <div class="flex flex-col gap-2">
                  <label for={notesField().name}>Notes</label>
                  <FieldInfo field={notesField()} />
                </div>
                <textarea
                  class="col-span-2 border-gray-200 focus:border-black focus:ring-black"
                  id={notesField().name}
                  name={notesField().name}
                  value={notesField().state.value}
                  onBlur={notesField().handleBlur}
                  onInput={(e) => notesField().handleChange(e.target.value)}
                  rows={4}
                />
              </>
            );
          }}
        />
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
          children={(state) => {
            return (
              <button
                class="col-span-3 ml-auto h-12 max-w-min border px-4 py-1 text-center transition-colors hover:bg-gray-50"
                type="submit"
                disabled={!state().canSubmit}
              >
                {state().isSubmitting ? "..." : "Save"}
              </button>
            );
          }}
        />
      </div>
      <form.Field name="exercises" mode="array">
        {(exercisesArrayField) => (
          <>
            <Show when={exercisesArrayField().state.value.length > 0}>
              <Index each={exercisesArrayField().state.value}>
                {(exerciseValue, i) => (
                  <div class="flex flex-col gap-1 bg-white p-4 md:px-6">
                    <form.Field
                      name={`exercises[${i}].exerciseTypeId`}
                      validators={{
                        onChange: string(),
                      }}
                    >
                      {(exerciseTypeIdField) => (
                        <>
                          <label for={exerciseTypeIdField().name}>
                            Exercise
                          </label>
                          <select
                            class="border-gray-200 focus:border-black focus:ring-black"
                            onInput={(e) =>
                              exerciseTypeIdField().handleChange(
                                e.currentTarget.value,
                              )
                            }
                            id={exerciseTypeIdField().name}
                            name={exerciseTypeIdField().name}
                            value={exerciseTypeIdField().state.value}
                            onBlur={exerciseTypeIdField().handleBlur}
                          >
                            <Index
                              each={exerciseTypes()}
                              fallback={<option disabled>Loading...</option>}
                            >
                              {(exerciseType) => (
                                <option value={exerciseType().id}>
                                  {exerciseType().name}
                                </option>
                              )}
                            </Index>
                          </select>
                          <FieldInfo field={exerciseTypeIdField()} />
                        </>
                      )}
                    </form.Field>
                    <div class="grid grid-cols-2 gap-4">
                      <form.Field
                        name={`exercises[${i}].weight`}
                        validators={{
                          onBlur: coerce(number(), Number),
                        }}
                      >
                        {(weightField) => (
                          <div class="flex flex-col gap-1">
                            <label for={weightField().name}>Weight</label>
                            <input
                              type="text"
                              class="border-gray-200 focus:border-black focus:ring-black"
                              step={0.01}
                              onInput={(e) =>
                                weightField().handleChange(
                                  e.currentTarget.value,
                                )
                              }
                              id={weightField().name}
                              name={weightField().name}
                              value={weightField().state.value}
                              onBlur={weightField().handleBlur}
                            />
                            <FieldInfo field={weightField()} />
                          </div>
                        )}
                      </form.Field>
                      <form.Field
                        name={`exercises[${i}].targetReps`}
                        validators={{
                          onBlur: number([minValue(0)]),
                        }}
                      >
                        {(targetRepsField) => (
                          <div class="flex flex-col gap-1">
                            <label for={targetRepsField().name}>
                              Target Reps
                            </label>
                            <input
                              type="number"
                              class="border-gray-200 focus:border-black focus:ring-black"
                              onInput={(e) =>
                                targetRepsField().handleChange(
                                  Number(e.currentTarget.value),
                                )
                              }
                              id={targetRepsField().name}
                              name={targetRepsField().name}
                              value={targetRepsField().state.value}
                              onBlur={targetRepsField().handleBlur}
                            />
                            <FieldInfo field={targetRepsField()} />
                          </div>
                        )}
                      </form.Field>
                    </div>
                    <form.Field
                      name={`exercises[${i}].notes`}
                      validators={{
                        onChange: string([maxLength(1000)]),
                      }}
                    >
                      {(notesField) => (
                        <div class="flex flex-col gap-1">
                          <label for={notesField().name}>Notes</label>
                          <textarea
                            class="border-gray-200 focus:border-black focus:ring-black"
                            onInput={(e) =>
                              notesField().handleChange(e.currentTarget.value)
                            }
                            id={notesField().name}
                            name={notesField().name}
                            value={notesField().state.value}
                            onBlur={notesField().handleBlur}
                            rows={3}
                          />
                          <FieldInfo field={notesField()} />
                        </div>
                      )}
                    </form.Field>
                    <form.Field
                      name={`exercises[${i}].sets`}
                      mode="array"
                      preserveValue
                    >
                      {(setsArrayField) => (
                        <div class="flex flex-col gap-1">
                          <label for={setsArrayField().name}>Sets</label>
                          <div class="grid grid-cols-7 gap-2 lg:grid-cols-10">
                            <Show
                              when={setsArrayField().state.value.length > 0}
                            >
                              <Index each={setsArrayField().state.value}>
                                {(_, j) => (
                                  <form.Field
                                    name={`exercises[${i}].sets[${j}]`}
                                    validators={{
                                      onChange: number([minValue(0)]),
                                    }}
                                  >
                                    {(setField) => (
                                      <button
                                        type="button"
                                        class="size-10 border bg-white text-center transition-colors hover:bg-gray-50"
                                        id={setField().name}
                                        name={setField().name}
                                        onClick={() =>
                                          setField().state.value === 1
                                            ? setsArrayField().removeValue(j)
                                            : setField().handleChange(
                                                // @ts-ignore
                                                setField().state.value - 1,
                                              )
                                        }
                                        onContextMenu={(e: MouseEvent) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setField().handleChange(
                                            // @ts-ignore
                                            setField().state.value + 1,
                                          );
                                        }}
                                      >
                                        {/* @ts-ignore */}
                                        {setField().state.value}
                                      </button>
                                    )}
                                  </form.Field>
                                )}
                              </Index>
                            </Show>
                            <button
                              onClick={() =>
                                setsArrayField().pushValue(
                                  exerciseValue().targetReps,
                                )
                              }
                              type="button"
                              class="size-10 border bg-white text-center text-xl transition-colors hover:bg-gray-50"
                            >
                              +
                            </button>
                          </div>
                          <FieldInfo field={setsArrayField()} />
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}
              </Index>
            </Show>

            <button
              onClick={() =>
                exercisesArrayField().pushValue({
                  weight: "0",
                  targetReps: 8,
                  notes: "",
                  exerciseTypeId: "",
                  sets: [],
                })
              }
              type="button"
              class="min-h-16 bg-white px-2 py-1 text-center transition-colors hover:bg-gray-50"
              style={{
                "grid-column": `span ${4 - (exercisesArrayField().state.value.length % 4)}`,
              }}
            >
              Add Exercise
            </button>
          </>
        )}
      </form.Field>
    </form>
  );
}
