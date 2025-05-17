import { format } from "date-fns";
import WorkoutMenu from "~/components/workouts/menu";
import type { WorkoutWithRelations } from "~/server/db/schema";

const kgFormatter = Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
});

export default function WorkoutEntry({
  workout,
}: {
  workout: WorkoutWithRelations;
}) {
  return (
    <div className="bg-white p-4 transition-colors md:px-6">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-lg font-medium">
          {format(workout.date, "dd/MM/yyyy, h:mm aaa")}
        </h2>
        <WorkoutMenu workout={workout} />
      </div>
      <p className="text-gray-600">{workout.notes}</p>
      <ul className="mt-2 space-y-2">
        {workout.exercises.map((exercise) => (
          <li key={exercise.id}>
            <h3 className="text-xl font-semibold">
              {exercise.exerciseType.name}
            </h3>
            <p className="text-gray-600">
              {`${kgFormatter.format(exercise.weight)} kg`}
            </p>
            <p className="text-gray-600">{exercise.notes}</p>
            <ul className="mt-2 flex flex-row space-x-2">
              {exercise.sets.map((set, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: all we got
                  key={i}
                  className="inline-flex size-10 items-center justify-center border bg-white"
                >
                  {set.reps}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
