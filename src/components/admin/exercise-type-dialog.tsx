import { useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import * as v from "valibot";
import { useAppForm } from "~/hooks/form";
import {
  createExerciseType,
  updateExerciseType,
} from "~/lib/server/admin/functions";
import {
  type ExerciseMeasurement,
  type ExerciseType,
  exerciseMeasurements,
} from "~/lib/server/db/schema";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Spinner } from "../ui/kibo-ui/spinner";
import { Label } from "../ui/label";

const formSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Please enter a name"),
    v.maxLength(100),
  ),
  measurement: v.picklist(exerciseMeasurements),
});

const measurementLabels: Record<ExerciseMeasurement, string> = {
  reps: "Reps",
  time: "Timed",
};

export default function ExerciseTypeDialog({
  exerciseType,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  exerciseType?: ExerciseType & { usage: number };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const mutation = useMutation({
    mutationFn: async (data: v.InferOutput<typeof formSchema>) =>
      exerciseType
        ? await updateExerciseType({ data: { ...data, id: exerciseType.id } })
        : await createExerciseType({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-types"] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success(exerciseType ? "Exercise updated" : "Exercise created");
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: exerciseType?.name ?? "",
      measurement: exerciseType?.measurement ?? "reps",
    } as v.InferInput<typeof formSchema>,
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      // Failures are toasted by the mutation's `onError`
      await mutation.mutateAsync(v.parse(formSchema, value)).catch(() => {});
    },
  });

  const canSubmit = useStore(form.store, (state) => state.canSubmit);
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  // Logged sets are stored as reps or seconds, so the server rejects switching
  const measurementLocked = (exerciseType?.usage ?? 0) > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          form.reset();
        }
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {exerciseType ? "Edit exercise" : "New exercise"}
            </DialogTitle>
            <DialogDescription>
              Exercises are shared by everyone logging workouts.
            </DialogDescription>
          </DialogHeader>
          <form.AppField name="name">
            {(field) => <field.InputField label="Name" autoComplete="off" />}
          </form.AppField>
          <form.Field name="measurement">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Measured in</Label>
                <div className="flex flex-row gap-2">
                  {exerciseMeasurements.map((measurement) => (
                    <Button
                      key={measurement}
                      type="button"
                      variant="outline"
                      disabled={measurementLocked}
                      className={cn(
                        "flex-1",
                        field.state.value === measurement &&
                          "border-primary dark:border-primary",
                      )}
                      aria-pressed={field.state.value === measurement}
                      onClick={() => field.handleChange(measurement)}
                    >
                      {measurementLabels[measurement]}
                    </Button>
                  ))}
                </div>
                {measurementLocked ? (
                  <p className="text-muted-foreground text-sm">
                    Can't be changed once the exercise has been logged.
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>
          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? <Spinner className="size-4" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
