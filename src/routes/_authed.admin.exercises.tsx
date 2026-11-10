import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ExerciseTypeDialog from "~/components/admin/exercise-type-dialog";
import ExerciseTypeMenu from "~/components/admin/exercise-type-menu";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getAdminExerciseTypesQueryOptions } from "~/lib/server/admin/functions";

export const Route = createFileRoute("/_authed/admin/exercises")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      getAdminExerciseTypesQueryOptions,
    );

    return {
      crumb: "Exercises",
    };
  },
  component: AdminExercises,
});

function AdminExercises() {
  const { data: exerciseTypes = [] } = useQuery(
    getAdminExerciseTypesQueryOptions,
  );
  const [search, setSearch] = useState("");

  const filtered = exerciseTypes.filter((exerciseType) =>
    exerciseType.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="bg-border -m-4 flex h-full grow flex-col gap-[0.0625rem] overflow-y-auto rounded-b-xl">
      <div className="bg-background flex flex-col gap-4 p-4 md:px-6">
        <div className="flex flex-row items-center justify-between">
          <h1 className="text-xl font-semibold">Exercises</h1>
          <ExerciseTypeDialog trigger={<Button>New</Button>} />
        </div>
        <Input
          type="search"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {filtered.map((exerciseType) => (
        <div
          key={exerciseType.id}
          className="bg-background flex flex-row items-center justify-between gap-4 p-4 md:px-6"
        >
          <div className="flex flex-col gap-1">
            <span className="font-medium">{exerciseType.name}</span>
            <span className="text-muted-foreground text-sm">
              Logged {exerciseType.usage}{" "}
              {exerciseType.usage === 1 ? "time" : "times"}
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <Badge variant="secondary">
              {exerciseType.measurement === "time" ? "Timed" : "Reps"}
            </Badge>
            <ExerciseTypeMenu exerciseType={exerciseType} />
          </div>
        </div>
      ))}
      {filtered.length === 0 ? (
        <div className="bg-background text-muted-foreground p-4 text-center md:px-6">
          No exercises found
        </div>
      ) : null}
    </div>
  );
}
