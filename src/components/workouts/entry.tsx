import { format } from "date-fns";
import WorkoutMenu from "~/components/workouts/menu";
import type { WorkoutWithRelations } from "~/lib/server/db/schema";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const kgFormatter = Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
});

export default function WorkoutEntry({
  workout,
}: {
  workout: WorkoutWithRelations;
}) {
  return (
    <div className="bg-background p-4 transition-colors md:px-6">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-lg font-medium">
          {format(workout.date, "dd/MM/yyyy, h:mm aaa")}
        </h2>
        <WorkoutMenu workout={workout} />
      </div>
      {workout.notes && (
        <p className="text-muted-foreground">{workout.notes}</p>
      )}
      {workout.tags && workout.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {workout.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs capitalize">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <ul className="mt-2 space-y-2">
        {workout.exercises.map((exercise) => (
          <li key={exercise.id}>
            <h3 className="text-xl font-semibold">
              {exercise.exerciseType.name}
            </h3>
            <p className="text-muted-foreground">
              {`${kgFormatter.format(exercise.weight)} kg`}
            </p>
            <p className="text-muted-foreground">{exercise.notes}</p>
            <ul className="mt-2 flex flex-row gap-2">
              {exercise.sets.map((set, i) => (
                <Button
                  // biome-ignore lint/suspicious/noArrayIndexKey: all we got
                  key={i}
                  asChild
                  variant="outline"
                  size="icon"
                  className="hover:bg-background"
                >
                  <li>{set.reps}</li>
                </Button>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
