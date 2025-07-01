import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { EditIcon, MoreVerticalIcon, TrashIcon } from "lucide-react";
import type { Workout } from "~/lib/server/db/schema";
import { deleteWorkout } from "~/lib/server/functions";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export default function WorkoutMenu({ workout }: { workout: Workout }) {
  const queryClient = useQueryClient();

  const deleteWorkoutMutation = useMutation({
    mutationFn: async () => await deleteWorkout({ data: { id: workout.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/workouts/edit/$id" params={{ id: workout.id }}>
            <EditIcon className="size-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => deleteWorkoutMutation.mutate()}>
          <TrashIcon className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
