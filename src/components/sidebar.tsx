import { A, createAsync } from "@solidjs/router";
import { Component, type JSX } from "solid-js";
import { getAuthenticatedUser } from "~/server/utils";
import DumbbellIcon from "~/components/icons/dumbbell";
import GaugeIcon from "~/components/icons/gauge";
import CalendarIcon from "~/components/icons/calendar";
import AreaChartIcon from "~/components/icons/area-chart";
import SigmaIcon from "~/components/icons/sigma";

function SidebarLink({
  href,
  children,
  icon: Icon,
  end,
}: {
  href: string;
  children: JSX.Element;
  icon: Component<{ class: string }>;
  end?: boolean;
}) {
  return (
    <A
      href={href}
      class="flex flex-row items-center gap-2 rounded-md px-3 py-2 text-lg transition-colors"
      activeClass="bg-black text-white hover:bg-black hover:text-white"
      inactiveClass="hover:bg-gray-100"
      end={end}
    >
      <Icon class="size-6" />
      {children}
    </A>
  );
}

export default function Sidebar() {
  const user = createAsync(() => getAuthenticatedUser());

  return (
    <div class="flex flex-col space-y-4 border-b bg-white pb-4 text-gray-900 md:flex-[20_1_0] md:border-b-0 md:border-r md:pb-0 2xl:flex-[10_1_0]">
      <div class="flex items-center space-x-2 border-b p-4">
        <SigmaIcon class="size-10" />
        <h1 class="text-2xl font-semibold text-black">Sigma</h1>
      </div>
      <div class="flex items-center space-x-4 px-4 md:px-8">
        <div>
          <p class="font-semibold">{user()?.name}</p>
          <p class="text-sm text-gray-500">{user()?.email}</p>
        </div>
      </div>
      <nav>
        <ul class="flex flex-row space-x-4 overflow-x-scroll px-4 md:flex-col md:space-x-0 md:space-y-2 md:overflow-hidden">
          <li>
            <SidebarLink href="/" icon={GaugeIcon} end>
              Dashboard
            </SidebarLink>
          </li>
          <li>
            <SidebarLink href="/workouts" icon={DumbbellIcon}>
              Workouts
            </SidebarLink>
          </li>
          <li>
            <SidebarLink href="/calendar" icon={CalendarIcon}>
              Calendar
            </SidebarLink>
          </li>
          <li>
            <SidebarLink href="/analytics" icon={AreaChartIcon}>
              Analytics
            </SidebarLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}
