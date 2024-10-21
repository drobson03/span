import { useQuery } from "@tanstack/react-query";
import { add, endOfWeek, format, isBefore, isSameDay } from "date-fns";
import { useMemo } from "react";
import { getWorkoutsByDateQueryOptions } from "~/server/functions";
import { cn } from "~/utils";

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
    <div className="flex w-auto flex-col gap-2 border p-4 md:max-w-min md:px-6">
      <h2 className="text-2xl font-semibold">Heatmap</h2>
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-scroll md:overflow-x-auto">
        {dates.map((date) => (
          <div
            key={format(date, "yyyy-MM-dd")}
            className={cn(
              "size-2.5 border",
              workouts?.[format(date, "yyyy-MM-dd")]?.length && "bg-black",
              isSameDay(today, date) && "border-black",
            )}
          />
        ))}
      </div>
    </div>
  );
}
