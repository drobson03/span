import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { saveRoutine } from "~/lib/server/routines";
import type { WorkoutTemplate } from "~/lib/workout-template";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

export function SaveRoutine({
  getTemplate,
}: {
  getTemplate: () => WorkoutTemplate;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: () => saveRoutine({ data: { name, template: getTemplate() } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      setOpen(false);
      setName("");
      setSaved(true);
    },
  });
  return (
    <div className="col-span-3 flex items-center gap-3">
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          mutation.reset();
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            Save as routine
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Save routine</DialogTitle>
          <DialogDescription>
            Save these exercises, weights, rep targets, and number of sets for
            your next workout.
          </DialogDescription>
          <Label htmlFor="routine-name">Routine name</Label>
          <Input
            id="routine-name"
            placeholder="Push A"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {mutation.isError && (
            <p role="alert" className="text-destructive">
              {mutation.error.message}
            </p>
          )}
          <Button
            type="button"
            disabled={!name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save routine"}
          </Button>
        </DialogContent>
      </Dialog>
      {saved && (
        <p role="status" className="text-muted-foreground text-sm">
          Routine saved.
        </p>
      )}
    </div>
  );
}
