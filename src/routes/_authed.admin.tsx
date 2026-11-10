import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAdmin } from "~/lib/utils";

export const Route = createFileRoute("/_authed/admin")({
  beforeLoad: ({ context }) => {
    if (!isAdmin(context.user)) {
      throw redirect({ to: "/" });
    }
  },
  loader: () => {
    return {
      crumb: "Admin",
    };
  },
});
