import { useQuery } from "@tanstack/react-query";
import { add, endOfWeek, format, isBefore, isSameDay } from "date-fns";
import { useMemo } from "react";
import { getWorkoutsByDateQueryOptions } from "~/lib/server/functions";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export default function Heatmap() {
  const today = new Date();
  const yearAgo = add(endOfWeek(today), {
    days: 1,
    weeks: -53,
  });

  const { data: workouts } = useQuery(getWorkoutsByDateQueryOptions(yearAgo));

  const dates = useMemo(() => {
    const dates = [];
    let currentDate = yearAgo;

    while (isBefore(currentDate, today)) {
      dates.push(currentDate);
      currentDate = add(currentDate, { days: 1 });
    }

    dates.push(today);

    return dates;
  }, [today, yearAgo]);

  return (
    <Card className="flex w-auto flex-col gap-2 border md:max-w-min">
      <CardHeader>
        <CardTitle>Heatmap</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-scroll md:overflow-x-auto">
        {dates.map((date) => (
          <div
            key={format(date, "yyyy-MM-dd")}
            className={cn(
              "size-3 border",
              workouts?.[format(date, "yyyy-MM-dd")]?.length && "bg-primary",
              isSameDay(today, date) && "border-primary",
            )}
          />
        ))}
      </CardContent>
    </Card>
  );
}
