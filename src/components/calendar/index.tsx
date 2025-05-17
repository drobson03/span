import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  addWeeks,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfISOWeek,
} from "date-fns";
import { useMemo } from "react";
import { getWorkoutsByDateForMonthQueryOptions } from "~/lib/server/functions";
import { chunk, cn } from "~/lib/utils";

function getDatesForCalendarView(month: Date) {
  let startDate = startOfISOWeek(month);

  const endDate = addWeeks(startDate, 6);

  const dates: Date[] = [];

  while (isBefore(startDate, endDate)) {
    dates.push(startDate);
    startDate = addDays(startDate, 1);
  }

  return dates;
}

export default function Calendar({ month }: { month: Date }) {
  const now = new Date();
  const dates = useMemo(
    () => chunk(getDatesForCalendarView(month), 7),
    [month],
  );

  const { data: workouts } = useQuery(
    getWorkoutsByDateForMonthQueryOptions(month),
  );

  return (
    <div className="flex flex-col gap-[0.0625rem] border-b bg-gray-200 md:grid md:grid-cols-7 md:place-items-stretch">
      {dates.map((weekDays) => (
        <div
          key={format(weekDays[0]!, "yyyy-MM-dd")}
          className="gap-[0.0625rem] divide-y md:col-span-7 md:grid md:grid-cols-subgrid md:place-items-stretch md:divide-y-0"
        >
          {weekDays.map((day) => (
            <div
              key={format(day, "yyyy-MM-dd")}
              className={cn(
                "group flex items-center justify-between bg-white p-4 transition-colors hover:cursor-pointer hover:bg-gray-50 md:min-h-32 md:px-6",
                isSameDay(day, now) && "bg-black text-white hover:bg-black",
                !isSameMonth(day, month) && "text-gray-500 hover:text-black",
              )}
            >
              <h2 className="text-lg font-medium">{format(day, "dd MMM")}</h2>
              {workouts?.[format(day, "yyyy-MM-dd")] ? (
                <span
                  className={cn(
                    "text-3xl transition-colors",
                    isSameMonth(day, month)
                      ? "text-green-500"
                      : "text-green-400 group-hover:text-green-500",
                  )}
                >
                  ✓
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
