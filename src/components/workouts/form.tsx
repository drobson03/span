import ArrowDownIcon from "@heroicons/react/16/solid/ArrowDownIcon";
import ArrowLeftIcon from "@heroicons/react/16/solid/ArrowLeftIcon";
import ArrowRightIcon from "@heroicons/react/16/solid/ArrowRightIcon";
import ArrowUpIcon from "@heroicons/react/16/solid/ArrowUpIcon";
import XMarkIcon from "@heroicons/react/16/solid/XMarkIcon";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { format, parse } from "date-fns";
import { useMemo, useState } from "react";
import { maxLength, minValue, number, pipe, string, transform } from "valibot";
import type { WorkoutWithRelations } from "~/lib/server/db/schema";
import {
  type WorkoutFormData,
  createWorkout,
  getExerciseTypesQueryOptions,
  updateWorkout,
} from "~/lib/server/functions";
import Spinner from "../spinner";

function FieldInfo(props: { field: AnyFieldApi }) {
  return props.field.state.meta.errors ? (
    <em>{props.field.state.meta.errors.join(", ")}</em>
  ) : null;
}

export default function WorkoutForm({
  workout,
}: {
  workout?: WorkoutWithRelations;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const upsertWorkoutMutation = useMutation({
    mutationFn: async (data: WorkoutFormData) =>
      data.action === "create"
        ? await createWorkout({ data })
        : await updateWorkout({ data }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      await navigate({ to: "/workouts" });
    },
  });

  const form = useForm({
    defaultValues: {
      datetime: format(workout?.date ?? new Date(), "yyyy-MM-dd'T'HH:mm"),
      notes: workout?.notes ?? "",
      exercises:
        workout?.exercises.map((exercise) => ({
          weight: String(exercise.weight),
          notes: exercise.notes ?? "",
          targetReps: exercise.targetReps,
          exerciseTypeId: exercise.exerciseTypeId,
          sets: exercise.sets.map((set) => ({
            reps: set.reps,
          })),
        })) ?? [],
    },
    onSubmit: async ({ value }) => {
      await upsertWorkoutMutation.mutateAsync({
        ...value,
        ...(workout
          ? { id: workout.id, action: "edit" }
          : { action: "create" }),
        datetime: parse(
          value.datetime,
          "yyyy-MM-dd'T'HH:mm",
          new Date(),
        ).toISOString(),
      });
    },
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
                {state.isSubmitting ? <Spinner className="size-4" /> : "Save"}
              </button>
            );
          }}
        </form.Subscribe>
      </div>
      <form.Field name="exercises" mode="array">
        {(exercisesArrayField) => (
          <>
            {exercisesArrayField.state.value.length > 0
              ? exercisesArrayField.state.value.map((_, i) => (
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
                          <div className="flex flex-row items-center justify-between">
                            <label htmlFor={exerciseTypeIdField.name}>
                              Exercise
                            </label>
                            <div className="flex flex-row items-center gap-2">
                              {i > 0 ? (
                                <button
                                  className="-mr-1 text-gray-500 transition-colors hover:text-red-500"
                                  type="button"
                                  onClick={() =>
                                    exercisesArrayField.moveValue(i, i - 1)
                                  }
                                >
                                  <ArrowLeftIcon className="hidden size-4 md:block" />
                                  <ArrowUpIcon className="size-4 md:hidden" />
                                </button>
                              ) : null}
                              {i <
                              exercisesArrayField.state.value.length - 1 ? (
                                <button
                                  className="-mr-1 text-gray-500 transition-colors hover:text-red-500"
                                  type="button"
                                  onClick={() =>
                                    exercisesArrayField.moveValue(i, i + 1)
                                  }
                                >
                                  <ArrowRightIcon className="hidden size-4 md:block" />
                                  <ArrowDownIcon className="size-4 md:hidden" />
                                </button>
                              ) : null}
                              <button
                                className="-mr-1 text-gray-500 transition-colors hover:text-red-500"
                                type="button"
                                onClick={() =>
                                  exercisesArrayField.removeValue(i)
                                }
                              >
                                <XMarkIcon className="size-4" />
                              </button>
                            </div>
                          </div>
                          <ExerciseTypeCombobox
                            exerciseTypeIdField={exerciseTypeIdField}
                          />
                          <FieldInfo field={exerciseTypeIdField} />
                        </>
                      )}
                    </form.Field>
                    <div className="grid grid-cols-2 gap-4">
                      <form.Field
                        name={`exercises[${i}].weight`}
                        validators={{
                          onBlur: pipe(string(), transform(Number)),
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
                                    name={`exercises[${i}].sets[${j}].reps`}
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
                                                setField.state.value - 1,
                                              )
                                        }
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setField.handleChange(
                                            setField.state.value + 1,
                                          );
                                        }}
                                      >
                                        {setField.state.value}
                                      </button>
                                    )}
                                  </form.Field>
                                ))
                              : null}
                            <form.Field name={`exercises[${i}].targetReps`}>
                              {(targetRepsField) => (
                                <button
                                  onClick={() =>
                                    setsArrayField.pushValue({
                                      reps: targetRepsField.state.value,
                                    })
                                  }
                                  type="button"
                                  className="size-10 border bg-white text-center text-xl transition-colors hover:bg-gray-50"
                                >
                                  +
                                </button>
                              )}
                            </form.Field>
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

function ExerciseTypeCombobox({
  exerciseTypeIdField,
}: {
  exerciseTypeIdField: AnyFieldApi;
}) {
  const { data: exerciseTypes } = useQuery(getExerciseTypesQueryOptions);
  const [input, setInput] = useState(
    exerciseTypes?.find(
      (exerciseType) => exerciseType.id === exerciseTypeIdField.state.value,
    )?.name ?? "",
  );

  return (
    <Command
      className="group border border-gray-200 focus-within:border-black focus-within:ring-black"
      label="Exercise"
    >
      <Command.Input
        className="w-full border-none ring-0 focus:outline-none"
        value={input}
        onValueChange={setInput}
      />
      <Command.List className="h-0 max-h-48 overflow-auto overscroll-contain transition-[height] duration-200 group-focus-within:h-[var(--cmdk-list-height)] group-focus-within:border-t">
        <Command.Empty className="px-3 py-2">No results found.</Command.Empty>

        {exerciseTypes?.map((exerciseType) => (
          <Command.Item
            key={exerciseType.id}
            value={exerciseType.id}
            keywords={[exerciseType.name]}
            className="cursor-pointer px-3 py-2 data-[selected=true]:bg-gray-100"
            onSelect={(value) => {
              exerciseTypeIdField.handleChange(value);
              setInput(
                exerciseTypes?.find((exerciseType) => exerciseType.id === value)
                  ?.name ?? "",
              );
            }}
          >
            {exerciseType.name}
          </Command.Item>
        ))}
      </Command.List>
    </Command>
  );
}
