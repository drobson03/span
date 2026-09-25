import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckIcon,
  ChevronLeftIcon,
  MinusIcon,
  PlusIcon,
  TimerIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  type ActiveExercise,
  type ActiveWorkoutDraft,
  completedExercises,
  draftKey,
  newDraft,
  parseDraft,
  restRemaining,
} from "~/lib/client/active-workout";
import {
  createWorkout,
  getExerciseTypesQueryOptions,
} from "~/lib/server/functions";

export default function ActiveWorkout({ userId }: { userId: string }) {
  const [draft, setDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [storageStatus, setStorageStatus] = useState("");
  const [recoveryError, setRecoveryError] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [saved, setSaved] = useState(false);
  const { data: exerciseTypes = [] } = useQuery(getExerciseTypesQueryOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const key = draftKey(userId);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setDraft(raw ? parseDraft(raw) : newDraft());
      setStorageStatus(
        raw
          ? "Draft restored from this device"
          : "Draft saves automatically on this device",
      );
    } catch {
      setRecoveryError(true);
    }
  }, [key]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 500);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, []);

  // Persist at the point of each edit, including immediately before navigation.
  function change(next: ActiveWorkoutDraft) {
    setDraft(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageStatus("Draft saved on this device");
    } catch {
      setStorageStatus(
        "Draft could not be saved. Keep this page open to avoid losing progress.",
      );
    }
  }

  const finish = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      await createWorkout({
        data: {
          action: "create",
          datetime: draft.startedAt,
          notes: "",
          tags: [],
          exercises: completedExercises(draft),
        },
      });
    },
    onSuccess: async () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["workouts"] });
      void queryClient.invalidateQueries({
        queryKey: ["exercise-progression"],
      });
      try {
        localStorage.removeItem(key);
      } catch {
        setStorageStatus(
          "Workout saved, but the local draft could not be removed. Discard it before starting another workout.",
        );
        return;
      }
      await navigate({ to: "/workouts" });
    },
  });

  if (!draft)
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Active workout</h1>
        <p aria-live="polite">
          {recoveryError
            ? "The saved draft could not be read. You can leave it untouched and go back, or start a new draft."
            : "Loading draft…"}
        </p>
        {recoveryError && (
          <Button
            onClick={() => {
              if (
                window.confirm(
                  "Replace the unreadable draft with a new workout?",
                )
              )
                change(newDraft());
            }}
          >
            Start a new draft
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/workouts">Back to workouts</Link>
        </Button>
      </div>
    );

  const total = draft.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completed = draft.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((set) => set.completed).length,
    0,
  );
  const remaining = restRemaining(draft.restEndsAt, now);
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  function updateExercise(
    id: string,
    update: (exercise: ActiveExercise) => ActiveExercise,
  ) {
    if (!draft) return;
    change({
      ...draft,
      exercises: draft.exercises.map((ex) => (ex.id === id ? update(ex) : ex)),
    });
  }

  return (
    <div className="bg-background min-h-dvh">
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 p-4">
          <Button asChild variant="ghost" className="min-h-11">
            <Link to="/workouts">
              <ChevronLeftIcon /> Save & exit
            </Link>
          </Button>
          <span className="text-muted-foreground text-sm">
            {completed} / {total} sets
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Active workout
          </h1>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {storageStatus}
          </p>
          <progress
            className="accent-primary h-2 w-full"
            value={completed}
            max={Math.max(1, total)}
            aria-label="Completed sets"
          />
        </div>
        <fieldset
          disabled={finish.isPending || saved}
          className="min-w-0 space-y-6 disabled:opacity-60"
        >
          <section
            className="bg-muted/40 space-y-4 rounded-xl border p-4"
            aria-labelledby="rest-heading"
          >
            <div className="flex items-center justify-between gap-4">
              <h2
                id="rest-heading"
                className="flex items-center gap-2 font-medium"
              >
                <TimerIcon className="size-5" /> Rest timer
              </h2>
              <label className="text-muted-foreground flex items-center gap-2 text-sm">
                Duration
                <select
                  className="bg-background text-foreground min-h-11 rounded-md border px-2"
                  value={draft.restSeconds}
                  onChange={(event) =>
                    change({
                      ...draft,
                      restSeconds: Number(event.target.value),
                    })
                  }
                >
                  {[30, 60, 90, 120, 180, 300].map((value) => (
                    <option key={value} value={value}>
                      {value}s
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p
                role="timer"
                aria-label="Rest remaining"
                className="text-4xl font-semibold tabular-nums"
              >
                {minutes}:{seconds}
              </p>
              <div className="flex gap-2">
                {remaining > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() =>
                        change({
                          ...draft,
                          restEndsAt:
                            Math.max(Date.now(), draft.restEndsAt ?? 0) + 30000,
                        })
                      }
                    >
                      +30s
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() => change({ ...draft, restEndsAt: null })}
                    >
                      Skip
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() =>
                      change({
                        ...draft,
                        restEndsAt: Date.now() + draft.restSeconds * 1000,
                      })
                    }
                  >
                    Start rest
                  </Button>
                )}
              </div>
            </div>
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {remaining > 0
                ? "Take a breath. Your next set is coming up."
                : draft.restEndsAt !== null
                  ? "Rest complete. Ready for your next set."
                  : "Completing a set starts your rest automatically."}
            </p>
          </section>
          {draft.exercises.map((exercise, index) => (
            <section
              key={exercise.id}
              className="space-y-4 rounded-xl border p-4"
              aria-label={`Exercise ${index + 1}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {exerciseTypes.find(
                    (type) => type.id === exercise.exerciseTypeId,
                  )?.name ?? "Unavailable exercise"}
                </h2>
                <Button
                  variant="ghost"
                  className="size-11"
                  aria-label={`Remove exercise ${index + 1}`}
                  onClick={() => {
                    if (window.confirm("Remove this exercise and its sets?"))
                      change({
                        ...draft,
                        exercises: draft.exercises.filter(
                          (ex) => ex.id !== exercise.id,
                        ),
                      });
                  }}
                >
                  <Trash2Icon />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label
                  htmlFor={`${exercise.id}-weight`}
                  className="space-y-2 text-sm"
                >
                  Weight
                  <Input
                    className="mt-2 min-h-11 text-base"
                    type="number"
                    id={`${exercise.id}-weight`}
                    inputMode="decimal"
                    min="0"
                    max="10000"
                    step="0.01"
                    value={exercise.weight}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber;
                      if (
                        Number.isFinite(value) &&
                        value >= 0 &&
                        value <= 10000
                      )
                        updateExercise(exercise.id, (ex) => ({
                          ...ex,
                          weight: value,
                        }));
                    }}
                  />
                </label>
                <label
                  htmlFor={`${exercise.id}-target`}
                  className="space-y-2 text-sm"
                >
                  Target reps
                  <Input
                    className="mt-2 min-h-11 text-base"
                    type="number"
                    id={`${exercise.id}-target`}
                    inputMode="numeric"
                    min="0"
                    max="999"
                    step="1"
                    value={exercise.targetReps}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber;
                      if (Number.isInteger(value) && value >= 0 && value <= 999)
                        updateExercise(exercise.id, (ex) => ({
                          ...ex,
                          targetReps: value,
                        }));
                    }}
                  />
                </label>
              </div>
              <div className="space-y-3">
                {exercise.sets.map((set, setIndex) => (
                  <div
                    key={set.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-2 ${set.completed ? "bg-primary/10" : "bg-muted/40"}`}
                  >
                    <span className="text-sm font-medium">
                      Set {setIndex + 1}
                    </span>
                    <fieldset
                      className="flex items-center gap-1"
                      aria-label={`Set ${setIndex + 1} reps`}
                    >
                      <Button
                        variant="outline"
                        className="size-11"
                        disabled={set.reps === 0}
                        aria-label={`Decrease reps for set ${setIndex + 1}`}
                        onClick={() =>
                          updateExercise(exercise.id, (ex) => ({
                            ...ex,
                            sets: ex.sets.map((s) =>
                              s.id === set.id ? { ...s, reps: s.reps - 1 } : s,
                            ),
                          }))
                        }
                      >
                        <MinusIcon />
                      </Button>
                      <span className="w-12 text-center text-lg font-semibold tabular-nums">
                        {set.reps}
                        <span className="text-muted-foreground block text-xs font-normal">
                          reps
                        </span>
                      </span>
                      <Button
                        variant="outline"
                        className="size-11"
                        disabled={set.reps === 999}
                        aria-label={`Increase reps for set ${setIndex + 1}`}
                        onClick={() =>
                          updateExercise(exercise.id, (ex) => ({
                            ...ex,
                            sets: ex.sets.map((s) =>
                              s.id === set.id ? { ...s, reps: s.reps + 1 } : s,
                            ),
                          }))
                        }
                      >
                        <PlusIcon />
                      </Button>
                    </fieldset>
                    <Button
                      variant={set.completed ? "default" : "outline"}
                      className="min-h-11 min-w-20"
                      aria-pressed={set.completed}
                      aria-label={`${set.completed ? "Undo" : "Complete"} set ${setIndex + 1}`}
                      onClick={() =>
                        change({
                          ...draft,
                          restEndsAt: set.completed
                            ? draft.restEndsAt
                            : Date.now() + draft.restSeconds * 1000,
                          exercises: draft.exercises.map((ex) =>
                            ex.id === exercise.id
                              ? {
                                  ...ex,
                                  sets: ex.sets.map((s) =>
                                    s.id === set.id
                                      ? { ...s, completed: !s.completed }
                                      : s,
                                  ),
                                }
                              : ex,
                          ),
                        })
                      }
                    >
                      {set.completed ? (
                        <>
                          <CheckIcon /> Done
                        </>
                      ) : (
                        "Complete"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="min-h-11 w-full"
                onClick={() =>
                  updateExercise(exercise.id, (ex) => ({
                    ...ex,
                    sets: [
                      ...ex.sets,
                      {
                        id: crypto.randomUUID(),
                        reps: ex.targetReps,
                        completed: false,
                      },
                    ],
                  }))
                }
              >
                <PlusIcon /> Add set
              </Button>
            </section>
          ))}
          <section className="space-y-3 rounded-xl border border-dashed p-4">
            {draft.exercises.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Choose your first exercise to get started. Each exercise begins
                with three sets.
              </p>
            )}
            <label htmlFor="active-exercise" className="text-sm font-medium">
              Add exercise
            </label>
            <select
              id="active-exercise"
              className="bg-background min-h-12 w-full rounded-md border px-3 text-base"
              value={selectedExercise}
              onChange={(event) => setSelectedExercise(event.target.value)}
            >
              <option value="">Choose an exercise</option>
              {exerciseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {exerciseTypes.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No exercise types are available yet.
              </p>
            )}
            <Button
              variant="outline"
              className="min-h-11 w-full"
              disabled={!selectedExercise}
              onClick={() => {
                change({
                  ...draft,
                  exercises: [
                    ...draft.exercises,
                    {
                      id: crypto.randomUUID(),
                      exerciseTypeId: selectedExercise,
                      weight: 0,
                      targetReps: 8,
                      sets: Array.from({ length: 3 }, () => ({
                        id: crypto.randomUUID(),
                        reps: 8,
                        completed: false,
                      })),
                    },
                  ],
                });
                setSelectedExercise("");
              }}
            >
              <PlusIcon /> Add exercise
            </Button>
          </section>
          <div className="space-y-3">
            <p className="text-muted-foreground text-center text-sm">
              Only completed sets are added to your workout history.
            </p>
            <Button
              className="min-h-12 w-full text-base"
              disabled={completed === 0}
              onClick={() => {
                if (
                  window.confirm(
                    `Finish workout with ${completed} completed sets? ${total - completed} unfinished sets will not be logged.`,
                  )
                )
                  finish.mutate();
              }}
            >
              {finish.isPending
                ? "Saving workout…"
                : saved
                  ? "Workout saved"
                  : "Finish workout"}
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 w-full"
              onClick={() => {
                if (
                  window.confirm(
                    "Discard this workout draft? This cannot be undone.",
                  )
                )
                  change(newDraft());
              }}
            >
              Discard draft
            </Button>
          </div>
        </fieldset>
        {saved && (
          <Button
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => {
              try {
                localStorage.removeItem(key);
                void navigate({ to: "/workouts" });
              } catch {
                setStorageStatus(
                  "Workout saved. Local storage is still unavailable; keep this page open and retry clearing the draft.",
                );
              }
            }}
          >
            Clear saved draft & exit
          </Button>
        )}
        {finish.isError && (
          <p role="alert" className="text-destructive text-sm">
            Could not save your workout. Your progress is still here; please try
            again.
          </p>
        )}
      </main>
    </div>
  );
}
