import {
  RegistryContext,
  RegistryProvider,
  scheduleTask,
  useAtomInitialValues,
} from "@effect/atom-react";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { referencePath } from "@taxkit/api-http/routes";
import { CalculatorSummaries } from "@taxkit/calculators/summaries";
import { Array, Function, Option, Result, Schema } from "effect";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import { publicSettingsAtom } from "#/lib/api-client.atoms";
import { WebsiteRootView } from "#/lib/host/schemas";
import type { WebsitePublicSettings } from "#/lib/host/schemas";
import type { LoaderContext } from "#/lib/pages/loader-context";
import { loadRoot } from "#/lib/pages/loaders";

import "../styles.css";

const SettingsUnavailable = () => (
  <main className="home">
    <h1>TaxKit</h1>
    <p role="alert">TaxKit cannot load its settings. Please try again later.</p>
  </main>
);

const RootShell = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en-AU">
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
);

// The browser registry was created before loaders ran; React uses that same
// registry. React can replay mount and cleanup in development, so disposal is
// scheduled and cancelled by the next mount rather than run immediately.
const BrowserRegistry = ({
  children,
  registry,
}: Readonly<{ children: ReactNode; registry: AtomRegistry.AtomRegistry }>) => {
  const pendingDisposal = useRef(Function.constVoid);
  useEffect(() => {
    pendingDisposal.current();
    return () => {
      pendingDisposal.current = scheduleTask(() => {
        registry.dispose();
      });
    };
  }, [registry]);
  return (
    <RegistryContext.Provider value={registry}>
      {children}
    </RegistryContext.Provider>
  );
};

const RootRegistry = ({
  children,
  registry,
}: Readonly<{ children: ReactNode; registry: LoaderContext["registry"] }>) =>
  Option.match(registry, {
    // Server rendering keeps an isolated registry per request.
    onNone: () => <RegistryProvider>{children}</RegistryProvider>,
    onSome: (value) => (
      <BrowserRegistry registry={value}>{children}</BrowserRegistry>
    ),
  });

const InitialSettings = ({
  children,
  settings,
}: Readonly<{ children: ReactNode; settings: WebsitePublicSettings }>) => {
  useAtomInitialValues([[publicSettingsAtom, Option.some(settings)]]);
  return children;
};

export const Route = createRootRouteWithContext<LoaderContext>()({
  component: function RootComponent() {
    const data = Route.useLoaderData();
    const { registry } = Route.useRouteContext();
    const view = useMemo(
      () => Schema.decodeUnknownResult(WebsiteRootView)(data.view),
      [data.view]
    );
    if (Result.isFailure(view)) {
      return <SettingsUnavailable />;
    }
    const { settings } = view.success;
    return (
      <RootRegistry registry={registry}>
        <InitialSettings settings={settings}>
          <div className="app-shell">
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <nav aria-label="Calculators">
              <ul>
                {Array.map(CalculatorSummaries, (calculator) => (
                  <li key={calculator.calculatorId}>
                    {calculator.calculatorId === "au.pay.take-home" ? (
                      <Link activeProps={{ "aria-current": "page" }} to="/">
                        {calculator.title}
                      </Link>
                    ) : (
                      <Link
                        activeProps={{ "aria-current": "page" }}
                        to="/calculators/$calculatorId"
                        params={{ calculatorId: calculator.calculatorId }}
                      >
                        {calculator.title}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              <a href={new URL(referencePath, settings.apiOrigin).href}>
                For developers: API documentation
              </a>
              <Link activeProps={{ "aria-current": "page" }} to="/agents">
                For agents: API access
              </Link>
              <Link params={{ _splat: "start/quickstart" }} to="/$">
                Documentation
              </Link>
            </nav>
            <main id="main-content" tabIndex={-1}>
              <Outlet />
            </main>
          </div>
        </InitialSettings>
      </RootRegistry>
    );
  },
  errorComponent: SettingsUnavailable,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "TaxKit" },
      {
        content:
          "Australian take-home pay, pay withholding and annual income tax calculators for 2025–26.",
        name: "description",
      },
    ],
  }),
  loader: ({ context, abortController }) =>
    loadRoot({ context, signal: abortController.signal }),
  shellComponent: RootShell,
  // Live settings are never treated as fresh public data; the one-minute
  // default applies to documentation routes.
  staleTime: 0,
});
