import type { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  ScrollRestoration,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { Body, Head, Html, Meta, Scripts } from "@tanstack/start";
import tailwind from "~/app.css?url";
import { getUser } from "~/server/auth/functions";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    meta: () => [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: () => [
      { rel: "preconnect", href: "https://rsms.me/" },
      { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
      { rel: "stylesheet", href: tailwind },
    ],
    scripts: () =>
      import.meta.env.DEV
        ? [
            {
              type: "module",
              children: `import RefreshRuntime from "/_build/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;`,
            },
          ]
        : [],
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
    <Html>
      <Head>
        <Meta />
      </Head>
      <Body>
        <main className="flex h-[100dvh] flex-col md:flex-row">{children}</main>
        <ScrollRestoration />
        <Scripts />
      </Body>
    </Html>
  );
}
