import { createFileRoute } from "@tanstack/react-router";
import { addMonths, parse, set, subMonths } from "date-fns";
import Calendar from "~/components/calendar";
import CalendarHeader from "~/components/calendar/header";
import { getWorkoutsByDateForMonthQueryOptions } from "~/lib/server/functions";

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

    return { month, crumb: "Calendar" };
  },
  component: CalendarMonth,
});

function CalendarMonth() {
  const { month } = Route.useLoaderData();

  const prevMonth = subMonths(month, 1);
  const nextMonth = addMonths(month, 1);

  return (
    <>
      <Calendar month={month} />
      <CalendarHeader
        month={month}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
      />
    </>
  );
}
