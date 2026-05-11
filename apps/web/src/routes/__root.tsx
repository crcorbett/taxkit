import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

import type { RouterContext } from "#/lib/route-runtime";

import "../styles.css";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      { title: "WhatTax" },
      {
        content: "WhatTax public app.",
        name: "description",
      },
    ],
  }),
  shellComponent: RootShell,
});

function RootShell({ children }: { readonly children: React.ReactNode }) {
  return (
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
}

function RootComponent() {
  return (
    <main className="app-shell">
      <Outlet />
    </main>
  );
}
