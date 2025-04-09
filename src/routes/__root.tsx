import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import tailwind from "~/app.css?url";
import { getUser } from "~/server/auth/functions";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
      links: [
        { rel: "preconnect", href: "https://rsms.me/" },
        { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
        { rel: "stylesheet", href: tailwind },
      ],
    }),
    component: RootComponent,
    beforeLoad: async () => {
      const { user } = await getUser();
      return {
        user,
      };
    },
  },
);

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <main className="flex h-[100dvh] flex-col md:flex-row">{children}</main>
        <Scripts />
      </body>
    </html>
  );
}
