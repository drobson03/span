import { useQuery } from "@tanstack/react-query";
import { Link, linkOptions } from "@tanstack/react-router";
import {
  CalendarIcon,
  ChartBarIcon,
  DumbbellIcon,
  HomeIcon,
  ListIcon,
  MoveUpRightIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import { getUserQueryOptions } from "~/lib/server/auth/functions";
import { isAdmin } from "~/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

const navItems = linkOptions([
  {
    title: "Dashboard",
    to: "/",
    icon: HomeIcon,
    activeOptions: {
      exact: true,
    },
  },
  {
    title: "Workouts",
    to: "/workouts",
    icon: DumbbellIcon,
  },
  {
    title: "Calendar",
    to: "/calendar/$",
    icon: CalendarIcon,
    params: {
      _splat: "",
    },
  },
  {
    title: "Analytics",
    to: "/analytics",
    icon: ChartBarIcon,
  },
]);

const adminNavItems = linkOptions([
  {
    title: "Exercises",
    to: "/admin/exercises",
    icon: ListIcon,
  },
  {
    title: "Users",
    to: "/admin/users",
    icon: UsersIcon,
  },
]);

function NavMenu({ items }: { items: typeof navItems | typeof adminNavItems }) {
  return (
    <SidebarMenu>
      {items.map(({ title, icon: Icon, ...item }) => (
        <SidebarMenuItem key={title}>
          <SidebarMenuButton tooltip={title} asChild>
            <Link
              activeProps={{
                "data-active": true,
              }}
              inactiveProps={{
                "data-active": false,
              }}
              {...item}
            >
              {Icon && <Icon />}
              <span>{title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export default function AppSidebar() {
  const { data: user } = useQuery(getUserQueryOptions);

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/">
                <MoveUpRightIcon className="!size-5" />
                <span className="text-base font-semibold">Span</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="New Workout"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                  asChild
                >
                  <Link to="/workouts/new">
                    <PlusIcon />
                    <span>New Workout</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <NavMenu items={navItems} />
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin(user) ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMenu items={adminNavItems} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
