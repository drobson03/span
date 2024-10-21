import { useForm } from "@tanstack/react-form";
import type { FieldApi } from "@tanstack/react-form";
import { valibotValidator } from "@tanstack/valibot-form-adapter";
import {
  maxLength,
  number,
  string,
  minValue,
  pipe,
  unknown,
  transform,
} from "valibot";
import { format, parse } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWorkout,
  getExerciseTypesQueryOptions,
  type WorkoutFormData,
} from "~/server/functions";
import { useNavigate } from "@tanstack/react-router";

function FieldInfo(props: {
  // biome-ignore lint/suspicious/noExplicitAny: FieldApi is a generic type
  field: FieldApi<any, any, any, any>;
}) {
  return props.field.state.meta.errors ? (
    <em>{props.field.state.meta.errors.join(", ")}</em>
  ) : null;
}

export default function WorkoutForm() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: exerciseTypes } = useQuery(getExerciseTypesQueryOptions);

  const createWorkoutMutation = useMutation({
    mutationFn: async (workout: WorkoutFormData) =>
      await createWorkout(workout),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      await navigate({ to: "/workouts" });
    },
  });

  const form = useForm({
    defaultValues: {
      datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      notes: "",
      exercises: [],
    } satisfies WorkoutFormData as WorkoutFormData,
    onSubmit: async ({ value }) => {
      await createWorkoutMutation.mutateAsync({
        ...value,
        datetime: parse(
          value.datetime,
          "yyyy-MM-dd'T'HH:mm",
          new Date(),
        ).toISOString(),
      });
    },
    validatorAdapter: valibotValidator(),
  });

  return (
    <form
      className="flex flex-col gap-[0.0625rem] border-b bg-gray-200 md:grid md:grid-cols-4 md:place-items-stretch"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="col-span-4 grid grid-cols-3 place-items-stretch gap-4 bg-white p-4 md:px-6">
        <form.Field name="datetime">
          {(datetimeField) => {
            return (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor={datetimeField.name}>Date &amp; Time</label>
                  <FieldInfo field={datetimeField} />
                </div>
                <input
                  className="col-span-2 border-gray-200 focus:border-black focus:ring-black"
                  id={datetimeField.name}
                  name={datetimeField.name}
                  value={datetimeField.state.value}
                  type="datetime-local"
                  onBlur={datetimeField.handleBlur}
                  onInput={(e) =>
                    datetimeField.handleChange(
                      (e.target as HTMLInputElement).value,
                    )
                  }
                />
              </>
            );
          }}
        </form.Field>
        <form.Field
          name="notes"
          validators={{
            onChange: pipe(string(), maxLength(1000)),
          }}
        >
          {(notesField) => {
            return (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor={notesField.name}>Notes</label>
                  <FieldInfo field={notesField} />
                </div>
                <textarea
                  className="col-span-2 border-gray-200 focus:border-black focus:ring-black"
                  id={notesField.name}
                  name={notesField.name}
                  value={notesField.state.value}
                  onBlur={notesField.handleBlur}
                  onInput={(e) =>
                    notesField.handleChange(
                      (e.target as HTMLTextAreaElement).value,
                    )
                  }
                  rows={4}
                />
              </>
            );
          }}
        </form.Field>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {(state) => {
            return (
              <button
                className="col-span-3 ml-auto h-12 max-w-min border px-4 py-1 text-center transition-colors hover:bg-gray-50"
                type="submit"
                disabled={!state.canSubmit}
              >
                {state.isSubmitting ? "..." : "Save"}
              </button>
            );
          }}
        </form.Subscribe>
      </div>
      <form.Field name="exercises" mode="array">
        {(exercisesArrayField) => (
          <>
            {exercisesArrayField.state.value.length > 0
              ? exercisesArrayField.state.value.map((exerciseValue, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: necessary for fields
                    key={i}
                    className="flex flex-col gap-1 bg-white p-4 md:px-6"
                  >
                    <form.Field
                      name={`exercises[${i}].exerciseTypeId`}
                      validators={{
                        onChange: string(),
                      }}
                    >
                      {(exerciseTypeIdField) => (
                        <>
                          <label htmlFor={exerciseTypeIdField.name}>
                            Exercise
                          </label>
                          <select
                            className="border-gray-200 focus:border-black focus:ring-black"
                            onInput={(e) =>
                              exerciseTypeIdField.handleChange(
                                e.currentTarget.value,
                              )
                            }
                            id={exerciseTypeIdField.name}
                            name={exerciseTypeIdField.name}
                            value={exerciseTypeIdField.state.value}
                            onBlur={exerciseTypeIdField.handleBlur}
                          >
                            {exerciseTypes?.map((exerciseType) => (
                              <option
                                key={exerciseType.id}
                                value={exerciseType.id}
                              >
                                {exerciseType.name}
                              </option>
                            ))}
                          </select>
                          <FieldInfo field={exerciseTypeIdField} />
                        </>
                      )}
                    </form.Field>
                    <div className="grid grid-cols-2 gap-4">
                      <form.Field
                        name={`exercises[${i}].weight`}
                        validators={{
                          onBlur: pipe(unknown(), transform(Number)),
                        }}
                      >
                        {(weightField) => (
                          <div className="flex flex-col gap-1">
                            <label htmlFor={weightField.name}>Weight</label>
                            <input
                              type="text"
                              className="border-gray-200 focus:border-black focus:ring-black"
                              step={0.01}
                              onInput={(e) =>
                                weightField.handleChange(e.currentTarget.value)
                              }
                              id={weightField.name}
                              name={weightField.name}
                              value={weightField.state.value}
                              onBlur={weightField.handleBlur}
                            />
                            <FieldInfo field={weightField} />
                          </div>
                        )}
                      </form.Field>
                      <form.Field
                        name={`exercises[${i}].targetReps`}
                        validators={{
                          onBlur: pipe(number(), minValue(0)),
                        }}
                      >
                        {(targetRepsField) => (
                          <div className="flex flex-col gap-1">
                            <label htmlFor={targetRepsField.name}>
                              Target Reps
                            </label>
                            <input
                              type="number"
                              className="border-gray-200 focus:border-black focus:ring-black"
                              onInput={(e) =>
                                targetRepsField.handleChange(
                                  Number(e.currentTarget.value),
                                )
                              }
                              id={targetRepsField.name}
                              name={targetRepsField.name}
                              value={targetRepsField.state.value}
                              onBlur={targetRepsField.handleBlur}
                            />
                            <FieldInfo field={targetRepsField} />
                          </div>
                        )}
                      </form.Field>
                    </div>
                    <form.Field
                      name={`exercises[${i}].notes`}
                      validators={{
                        onChange: pipe(string(), maxLength(1000)),
                      }}
                    >
                      {(notesField) => (
                        <div className="flex flex-col gap-1">
                          <label htmlFor={notesField.name}>Notes</label>
                          <textarea
                            className="border-gray-200 focus:border-black focus:ring-black"
                            onInput={(e) =>
                              notesField.handleChange(e.currentTarget.value)
                            }
                            id={notesField.name}
                            name={notesField.name}
                            value={notesField.state.value}
                            onBlur={notesField.handleBlur}
                            rows={3}
                          />
                          <FieldInfo field={notesField} />
                        </div>
                      )}
                    </form.Field>
                    <form.Field name={`exercises[${i}].sets`} mode="array">
                      {(setsArrayField) => (
                        <div className="flex flex-col gap-1">
                          <label htmlFor={setsArrayField.name}>Sets</label>
                          <div className="grid grid-cols-7 gap-2 lg:grid-cols-10">
                            {setsArrayField.state.value.length > 0
                              ? setsArrayField.state.value.map((_, j) => (
                                  <form.Field
                                    // biome-ignore lint/suspicious/noArrayIndexKey: necessary for fields
                                    key={j}
                                    name={`exercises[${i}].sets[${j}]`}
                                    validators={{
                                      onChange: pipe(number(), minValue(0)),
                                    }}
                                  >
                                    {(setField) => (
                                      <button
                                        type="button"
                                        className="size-10 border bg-white text-center transition-colors hover:bg-gray-50"
                                        id={setField.name}
                                        name={setField.name}
                                        onClick={() =>
                                          setField.state.value === 1
                                            ? setsArrayField.removeValue(j)
                                            : setField.handleChange(
                                                // @ts-ignore
                                                setField.state.value - 1,
                                              )
                                        }
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setField.handleChange(
                                            // @ts-ignore
                                            setField.state.value + 1,
                                          );
                                        }}
                                      >
                                        {/* @ts-ignore */}
                                        {setField.state.value}
                                      </button>
                                    )}
                                  </form.Field>
                                ))
                              : null}
                            <button
                              onClick={() =>
                                setsArrayField.pushValue(
                                  exerciseValue.targetReps,
                                )
                              }
                              type="button"
                              className="size-10 border bg-white text-center text-xl transition-colors hover:bg-gray-50"
                            >
                              +
                            </button>
                          </div>
                          <FieldInfo field={setsArrayField} />
                        </div>
                      )}
                    </form.Field>
                  </div>
                ))
              : null}

            <button
              onClick={() =>
                exercisesArrayField.pushValue({
                  weight: "0",
                  targetReps: 8,
                  notes: "",
                  exerciseTypeId: "",
                  sets: [],
                })
              }
              type="button"
              className="min-h-16 bg-white px-2 py-1 text-center transition-colors hover:bg-gray-50"
              style={{
                gridColumn: `span ${4 - (exercisesArrayField.state.value.length % 4)}`,
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
