import PencilIcon from "@heroicons/react/16/solid/PencilIcon";
import TrashIcon from "@heroicons/react/16/solid/TrashIcon";
import EllipsisVerticalIcon from "@heroicons/react/20/solid/EllipsisVerticalIcon";
import {
  Content,
  Item,
  Portal,
  Root,
  Trigger,
} from "@radix-ui/react-dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { Workout } from "~/server/db/schema";
import { deleteWorkout } from "~/server/functions";
import { twx } from "~/utils/twx";

const WorkoutMenuButton = twx(Item)`
  flex cursor-pointer items-center gap-2 px-3 py-2 outline-none transition-colors hover:bg-gray-100
`;

export default function WorkoutMenu({ workout }: { workout: Workout }) {
  const queryClient = useQueryClient();

  const deleteWorkoutMutation = useMutation({
    mutationFn: async () => await deleteWorkout(workout.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });

  return (
    <Root>
      <Trigger
        type="button"
        className="-mr-3 rounded-full p-1 outline-none transition-colors duration-200 hover:bg-gray-100"
      >
        <EllipsisVerticalIcon className="size-6" />
      </Trigger>
      <Portal>
        <Content
          className="mr-2 mt-1 rounded-md border bg-white shadow slide-in-from-top-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          align="end"
        >
          <WorkoutMenuButton asChild>
            <Link to="/workouts/edit/$id" params={{ id: workout.id }}>
              <PencilIcon className="size-4" />
              Edit
            </Link>
          </WorkoutMenuButton>
          <WorkoutMenuButton onClick={() => deleteWorkoutMutation.mutate()}>
            <TrashIcon className="size-4" />
            Delete
          </WorkoutMenuButton>
        </Content>
      </Portal>
    </Root>
  );
}
