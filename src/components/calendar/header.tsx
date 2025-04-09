import ChevronLeftIcon from "@heroicons/react/24/outline/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/24/outline/ChevronRightIcon";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";

export default function CalendarHeader({
  month,
  prevMonth,
  nextMonth,
}: {
  month: Date;
  prevMonth: Date;
  nextMonth: Date;
}) {
  return (
    <header className="hidden flex-row items-center justify-between border-b p-4 md:flex md:px-6">
      <h1 className="text-4xl font-semibold">Calendar</h1>
      <div className="flex flex-row items-center gap-2">
        <Link
          to="/calendar/$"
          params={{ _splat: format(prevMonth, "yyyy-MM") }}
          className="border p-1 transition-colors hover:bg-gray-50"
        >
          <ChevronLeftIcon className="size-6" />
        </Link>
        <Link
          to="/calendar/$"
          params={{ _splat: undefined }}
          className="w-40 border px-2 py-1 text-center transition-colors hover:bg-gray-50"
          title="Return to current month"
        >
          {format(month, "MMMM yyyy")}
        </Link>
        <Link
          to="/calendar/$"
          params={{ _splat: format(nextMonth, "yyyy-MM") }}
          className="border p-1 transition-colors hover:bg-gray-50"
        >
          <ChevronRightIcon className="size-6" />
        </Link>
      </div>
    </header>
  );
}
