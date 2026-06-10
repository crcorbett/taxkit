import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

import type { RouterContext } from "#/lib/route-runtime";

import "../styles.css";

const RootShell = ({ children }: { readonly children: React.ReactNode }) => (
  <html lang="en">
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
);

const RootComponent = () => (
  <main className="docs-app-shell">
    <Outlet />
  </main>
);

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      { title: "WhatTax Docs" },
      {
        content: "Public WhatTax engine, API and SDK documentation.",
        name: "description",
      },
    ],
  }),
  shellComponent: RootShell,
});
