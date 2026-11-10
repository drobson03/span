import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditIcon, MoreVerticalIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteExerciseType } from "~/lib/server/admin/functions";
import type { ExerciseType } from "~/lib/server/db/schema";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import ExerciseTypeDialog from "./exercise-type-dialog";

export default function ExerciseTypeMenu({
  exerciseType,
}: {
  exerciseType: ExerciseType & { usage: number };
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () =>
      await deleteExerciseType({ data: { id: exerciseType.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-types"] });
      toast.success(`Deleted ${exerciseType.name}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <EditIcon className="size-4" />
            Edit
          </DropdownMenuItem>
          {/* Deleting cascades to logged exercises, so only unused ones can go */}
          <DropdownMenuItem
            disabled={exerciseType.usage > 0 || deleteMutation.isPending}
            onSelect={() => deleteMutation.mutate()}
          >
            <TrashIcon className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ExerciseTypeDialog
        exerciseType={exerciseType}
        open={editing}
        onOpenChange={setEditing}
      />
    </>
  );
}
