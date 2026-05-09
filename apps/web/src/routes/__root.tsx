/// <reference types="vite/client" />

import { DefaultCatchBoundary } from "$/components/default-catch-boundary";
import { NotFound } from "$/components/not-found";
import { seo } from "@packages/core/seo";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@packages/ui/lib/theme";
import { ThemeToggle } from "@packages/ui/ui/theme-toggle";
import { Wordmark } from "@packages/ui/ui/wordmark";
import {
  createRootRoute,
  HeadContent,
  Link,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type * as React from "react";

import baseCss from "@packages/ui/styles/base.css?url";

export const Route = createRootRoute({
  errorComponent: DefaultCatchBoundary,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      ...seo({
        title: "WhatTax",
        description:
          "A public tax-modeling workspace built with TanStack Start and Effect.",
      }),
    ],
    links: [
      { rel: "stylesheet", href: baseCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "icon", href: "/favicon.ico" },
    ],
    scripts: [
      // Sets the .dark class on <html> before paint based on
      // localStorage + prefers-color-scheme. Avoids FOUC.
      { children: THEME_INIT_SCRIPT },
    ],
  }),
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <div className="mx-auto max-w-shell px-6 py-8 md:px-8 md:py-12">
            <header className="mb-12 flex items-center justify-between md:mb-16">
              <Link
                to="/"
                activeOptions={{ exact: true }}
                className="no-underline"
              >
                <Wordmark size="header" />
              </Link>
              <ThemeToggle />
            </header>
            <main>{children}</main>
          </div>
          <TanStackRouterDevtools position="bottom-right" />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
