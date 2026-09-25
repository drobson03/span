import {
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import AppSidebar from "~/components/app-sidebar";
import { Breadcrumbs } from "~/components/breadcrumbs";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { getUserQueryOptions } from "~/lib/server/auth/functions";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getUserQueryOptions);
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const active = useRouterState({
    select: (state) => state.location.pathname === "/workouts/active",
  });
  if (active) return <Outlet />;
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="border md:peer-data-[variant=inset]:shadow-none">
        <header className="flex h-16 shrink-0 items-center gap-2 rounded-t-xl border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumbs />
        </header>
        <main className="flex flex-col gap-4 p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
