import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Sidebar from "~/components/sidebar";
import { getUserQueryOptions } from "~/server/auth/functions";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getUserQueryOptions);
  },
  component: () => (
    <>
      <Sidebar />
      <Outlet />
    </>
  ),
});
