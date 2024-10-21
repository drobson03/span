import { createFileRoute } from "@tanstack/react-router";
import { set, addMonths, subMonths, parse } from "date-fns";
import Calendar from "~/components/calendar";
import CalendarHeader from "~/components/calendar/header";
import { getWorkoutsByDateForMonthQueryOptions } from "~/server/functions";

export const Route = createFileRoute("/_authed/calendar/$")({
  loader: async ({ context, params }) => {
    const month: Date = set(
      params._splat ? parse(params._splat, "yyyy-MM", new Date()) : new Date(),
      {
        date: 1,
      },
    );

    await context.queryClient.ensureQueryData(
      getWorkoutsByDateForMonthQueryOptions(month),
    );

    return { month };
  },
  component: CalendarMonth,
});

function CalendarMonth() {
  const { month } = Route.useLoaderData();

  const prevMonth = subMonths(month, 1);
  const nextMonth = addMonths(month, 1);

  return (
    <div className="md:flex-[80_1_0]">
      <CalendarHeader
        month={month}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
      />
      <Calendar month={month} />
    </div>
  );
}
