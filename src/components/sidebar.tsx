import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CalendarDaysIcon,
  DumbbellIcon,
  GaugeIcon,
  MoveUpRightIcon,
  TrendingUpIcon,
} from "lucide-react";
import { getUserQueryOptions } from "~/lib/server/auth/functions";

const SIDEBAR_LINK_CLASSNAME =
  "flex flex-row items-center gap-2 px-3 py-2 text-lg transition-colors";
const SIDEBAR_LINK_ACTIVE_PROPS = {
  className: "bg-black text-white hover:bg-black hover:text-white",
};
const SIDEBAR_LINK_INACTIVE_PROPS = { className: "hover:bg-gray-100" };

export default function Sidebar() {
  const { data: user } = useQuery(getUserQueryOptions);

  return (
    <div className="flex flex-col space-y-4 border-b bg-white pb-4 text-gray-900 md:flex-[20_1_0] md:border-r md:border-b-0 md:pb-0 2xl:flex-[10_1_0]">
      <div className="flex items-center space-x-2 border-b p-4">
        <MoveUpRightIcon className="size-10" />
        <h1 className="text-2xl font-semibold text-black">Span</h1>
      </div>
      <div className="flex items-center space-x-4 px-4 md:px-8">
        <div>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>
      <nav>
        <ul className="flex flex-row space-x-4 overflow-x-scroll px-4 md:flex-col md:space-y-2 md:space-x-0 md:overflow-hidden">
          <li>
            <Link
              to="/"
              className={SIDEBAR_LINK_CLASSNAME}
              activeProps={SIDEBAR_LINK_ACTIVE_PROPS}
              inactiveProps={SIDEBAR_LINK_INACTIVE_PROPS}
              activeOptions={{ exact: true }}
            >
              <GaugeIcon className="size-6" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/workouts"
              className={SIDEBAR_LINK_CLASSNAME}
              activeProps={SIDEBAR_LINK_ACTIVE_PROPS}
              inactiveProps={SIDEBAR_LINK_INACTIVE_PROPS}
            >
              <DumbbellIcon className="size-6" />
              Workouts
            </Link>
          </li>
          <li>
            <Link
              to="/calendar/$"
              className={SIDEBAR_LINK_CLASSNAME}
              activeProps={SIDEBAR_LINK_ACTIVE_PROPS}
              inactiveProps={SIDEBAR_LINK_INACTIVE_PROPS}
            >
              <CalendarDaysIcon className="size-6" />
              Calendar
            </Link>
          </li>
          <li>
            <Link
              to="/analytics"
              className={SIDEBAR_LINK_CLASSNAME}
              activeProps={SIDEBAR_LINK_ACTIVE_PROPS}
              inactiveProps={SIDEBAR_LINK_INACTIVE_PROPS}
            >
              <TrendingUpIcon className="size-6" />
              Analytics
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
