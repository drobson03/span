import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  XIcon,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import * as v from "valibot";
import { useAppForm } from "~/hooks/form";
import type { WorkoutWithRelations } from "~/lib/server/db/schema";
import {
  type WorkoutFormData,
  createWorkout,
  getExerciseTypesQueryOptions,
  updateWorkout,
} from "~/lib/server/functions";
import { Button } from "../ui/button";
import { Spinner } from "../ui/kibo-ui/spinner";
import { Label } from "../ui/label";
import {
  Tags,
  TagsTrigger,
  TagsValue,
  TagsContent,
  TagsInput,
  TagsList,
  TagsEmpty,
  TagsGroup,
  TagsItem,
} from "../ui/kibo-ui/tags";
import { CheckIcon, PlusIcon } from "lucide-react";

const formSchema = v.object({
  datetime: v.date(),
  notes: v.pipe(v.string(), v.maxLength(1000)),
  tags: v.array(v.string()),
  exercises: v.array(
    v.object({
      exerciseTypeId: v.string(),
      weight: v.number("Please enter a valid number"),
      targetReps: v.number("Please enter a valid number"),
      notes: v.pipe(v.string(), v.maxLength(1000)),
      sets: v.array(
        v.object({ reps: v.number("Please enter a valid number") }),
      ),
    }),
  ),
});

type FormData = v.InferOutput<typeof formSchema>;

const defaultTags = [
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
  { id: "upper", label: "Upper" },
  { id: "lower", label: "Lower" },
  { id: "full-body", label: "Full Body" },
  { id: "strength", label: "Strength" },
  { id: "endurance", label: "Endurance" },
  { id: "hypertrophy", label: "Hypertrophy" },
];

export default function WorkoutForm({
  workout,
}: {
  workout?: WorkoutWithRelations;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newTag, setNewTag] = useState<string>("");
  const [availableTags, setAvailableTags] =
    useState<{ id: string; label: string }[]>(defaultTags);

  // Debounce search input
  const [debouncedNewTag, setDebouncedNewTag] = useState<string>("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTagSearchChange = useCallback((value: string) => {
    setNewTag(value);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set debounced value after 300ms
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedNewTag(value);
    }, 300);
  }, []);

  // Create a map for faster tag lookups
  const tagMap = useMemo(() => {
    return new Map(availableTags.map((tag) => [tag.id, tag]));
  }, [availableTags]);

  // Memoize filtered tags to avoid recalculating on every render
  const filteredTags = useMemo(() => {
    if (!debouncedNewTag.trim()) return availableTags;

    const searchTerm = debouncedNewTag.toLowerCase();
    return availableTags.filter((tag) =>
      tag.label.toLowerCase().includes(searchTerm),
    );
  }, [availableTags, debouncedNewTag]);

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

  const { data: exerciseTypes } = useQuery(getExerciseTypesQueryOptions);

  const form = useAppForm({
    defaultValues: {
      datetime: workout?.date ?? new Date(),
      notes: workout?.notes ?? "",
      tags: workout?.tags ?? [],
      exercises:
        workout?.exercises.map((exercise) => ({
          weight: exercise.weight,
          notes: exercise.notes ?? "",
          targetReps: exercise.targetReps,
          exerciseTypeId: exercise.exerciseTypeId,
          sets: exercise.sets.map((set) => ({
            reps: set.reps,
          })),
        })) ?? [],
    } as FormData satisfies FormData,
    validators: {
      onChange: formSchema,
      onBlur: formSchema,
    },
    onSubmit: async ({ value }) => {
      await upsertWorkoutMutation.mutateAsync({
        ...value,
        ...(workout
          ? { id: workout.id, action: "edit" }
          : { action: "create" }),
        datetime: value.datetime.toISOString(),
        exercises: value.exercises.map((exercise) => ({
          ...exercise,
          weight: exercise.weight.toString(),
        })),
      });
    },
  });

  return (
    <form
      className="bg-border flex flex-col gap-[0.0625rem] md:grid md:grid-cols-4 md:place-items-stretch"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="bg-background col-span-4 flex grid-cols-3 flex-col place-items-stretch gap-4 p-4 md:grid md:px-6">
        <form.AppField name="datetime">
          {(field) => (
            <field.DatePickerField label="Date & Time" type="datetime" />
          )}
        </form.AppField>
        <form.AppField name="notes">
          {(field) => <field.TextareaField label="Notes" rows={4} />}
        </form.AppField>
        <form.AppField name="tags">
          {(field) => {
            // Memoize handlers to prevent unnecessary re-renders
            const handleRemove = useCallback(
              (value: string) => {
                if (!field.state.value.includes(value)) {
                  return;
                }
                field.handleChange(
                  field.state.value.filter((v) => v !== value),
                );
              },
              [field.state.value, field.handleChange],
            );

            const handleSelect = useCallback(
              (value: string) => {
                if (field.state.value.includes(value)) {
                  handleRemove(value);
                  return;
                }
                field.handleChange([...field.state.value, value]);
              },
              [field.state.value, field.handleChange, handleRemove],
            );

            const handleCreateTag = useCallback(() => {
              if (!newTag.trim()) return;

              const tagId = newTag.toLowerCase().replace(/\s+/g, "-");
              const newTagObj = { id: tagId, label: newTag };

              setAvailableTags((prev) => [...prev, newTagObj]);
              field.handleChange([...field.state.value, tagId]);
              setNewTag("");
              setDebouncedNewTag("");
            }, [newTag, field.state.value, field.handleChange]);

            // Memoize tag values to avoid re-rendering all tags when one changes
            const tagValues = useMemo(() => {
              return field.state.value.map((tagId) => {
                const tag = tagMap.get(tagId);
                return (
                  <TagsValue key={tagId} onRemove={() => handleRemove(tagId)}>
                    {tag?.label || tagId}
                  </TagsValue>
                );
              });
            }, [field.state.value, tagMap, handleRemove]);

            return (
              <div className="col-span-3 space-y-2">
                <Label htmlFor={field.name}>Tags</Label>
                <Tags className="w-full">
                  <TagsTrigger>{tagValues}</TagsTrigger>
                  <TagsContent>
                    <TagsInput
                      onValueChange={handleTagSearchChange}
                      placeholder="Search or create tag..."
                      value={newTag}
                    />
                    <TagsList>
                      <TagsEmpty>
                        {newTag && (
                          <button
                            className="mx-auto flex cursor-pointer items-center gap-2"
                            onClick={handleCreateTag}
                            type="button"
                          >
                            <PlusIcon
                              className="text-muted-foreground"
                              size={14}
                            />
                            Create new tag: {newTag}
                          </button>
                        )}
                      </TagsEmpty>
                      <TagsGroup>
                        {filteredTags.map((tag) => (
                          <TagsItem
                            key={tag.id}
                            onSelect={() => handleSelect(tag.id)}
                            value={tag.id}
                          >
                            {tag.label}
                            {field.state.value.includes(tag.id) && (
                              <CheckIcon
                                className="text-muted-foreground"
                                size={14}
                              />
                            )}
                          </TagsItem>
                        ))}
                      </TagsGroup>
                    </TagsList>
                  </TagsContent>
                </Tags>
              </div>
            );
          }}
        </form.AppField>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {(state) => {
            return (
              <Button
                variant="outline"
                className="col-span-3 ml-auto max-w-min"
                type="submit"
                disabled={!state.canSubmit}
              >
                {state.isSubmitting ? <Spinner className="size-4" /> : "Save"}
              </Button>
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
                    className="bg-background flex flex-col gap-2 p-4 md:px-6"
                  >
                    <form.AppField name={`exercises[${i}].exerciseTypeId`}>
                      {(field) => (
                        <field.ComboboxField
                          label="Exercise"
                          data={
                            exerciseTypes?.map((exerciseType) => ({
                              label: exerciseType.name,
                              value: exerciseType.id,
                            })) ?? []
                          }
                          type="exercise"
                        />
                      )}
                    </form.AppField>
                    {/* <form.Field
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
                          </div>
                          <ExerciseTypeCombobox
                            exerciseTypeIdField={exerciseTypeIdField}
                          />
                          <FieldInfo field={exerciseTypeIdField} />
                        </>
                      )}
                    </form.Field> */}
                    <div className="grid grid-cols-2 gap-4">
                      <form.AppField name={`exercises[${i}].weight`}>
                        {(field) => (
                          <field.InputField
                            label="Weight"
                            type="number"
                            step={0.01}
                          />
                        )}
                      </form.AppField>
                      <form.AppField name={`exercises[${i}].targetReps`}>
                        {(field) => (
                          <field.InputField
                            label="Target Reps"
                            type="number"
                            step={1}
                            min={0}
                          />
                        )}
                      </form.AppField>
                    </div>
                    <form.AppField name={`exercises[${i}].notes`}>
                      {(field) => (
                        <field.TextareaField label="Notes" rows={3} />
                      )}
                    </form.AppField>
                    <form.AppField name={`exercises[${i}].sets`} mode="array">
                      {(setsArrayField) => (
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={setsArrayField.name}>Sets</Label>
                          <div className="grid grid-cols-7 gap-2 lg:grid-cols-10">
                            {setsArrayField.state.value.length > 0
                              ? setsArrayField.state.value.map((_, j) => (
                                  <form.Field
                                    // biome-ignore lint/suspicious/noArrayIndexKey: necessary for fields
                                    key={j}
                                    name={`exercises[${i}].sets[${j}].reps`}
                                  >
                                    {(setField) => (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        type="button"
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
                                      </Button>
                                    )}
                                  </form.Field>
                                ))
                              : null}
                            <form.AppField name={`exercises[${i}].targetReps`}>
                              {(targetRepsField) => (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    setsArrayField.pushValue({
                                      reps: targetRepsField.state.value,
                                    })
                                  }
                                  type="button"
                                >
                                  +
                                </Button>
                              )}
                            </form.AppField>
                          </div>
                        </div>
                      )}
                    </form.AppField>

                    <div className="flex flex-row items-center gap-px">
                      {i > 0 ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() =>
                            exercisesArrayField.moveValue(i, i - 1)
                          }
                        >
                          <ArrowLeftIcon className="hidden size-4 md:block" />
                          <ArrowUpIcon className="size-4 md:hidden" />
                        </Button>
                      ) : null}
                      {i < exercisesArrayField.state.value.length - 1 ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() =>
                            exercisesArrayField.moveValue(i, i + 1)
                          }
                        >
                          <ArrowRightIcon className="hidden size-4 md:block" />
                          <ArrowDownIcon className="size-4 md:hidden" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => exercisesArrayField.removeValue(i)}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  </div>
                ))
              : null}

            <div
              className="bg-background p-4 md:col-span-(--n) md:px-6"
              style={
                {
                  "--n": 4 - (exercisesArrayField.state.value.length % 4),
                } as React.CSSProperties
              }
            >
              <Button
                variant="outline"
                onClick={() =>
                  exercisesArrayField.pushValue({
                    weight: 0,
                    targetReps: 8,
                    notes: "",
                    exerciseTypeId: "",
                    sets: [],
                  })
                }
                type="button"
                style={{
                  gridColumn: `span ${4 - (exercisesArrayField.state.value.length % 4)}`,
                }}
              >
                Add Exercise
              </Button>
            </div>
          </>
        )}
      </form.Field>
    </form>
  );
}
