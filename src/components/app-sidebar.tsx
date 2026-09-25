import { Link, linkOptions } from "@tanstack/react-router";
import {
  CalendarIcon,
  ChartBarIcon,
  DumbbellIcon,
  HomeIcon,
  PlusIcon,
  MoveUpRightIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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

export default function AppSidebar() {
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
                  tooltip="Start / resume workout"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                  asChild
                >
                  <Link to="/workouts/active">
                    <PlusIcon />
                    <span>Start / resume workout</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu>
              {navItems.map(({ title, icon: Icon, ...item }) => (
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
