import { RegistryProvider } from "@effect/atom-react";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useLoaderData,
} from "@tanstack/react-router";
import type { CalculatorCatalogResponse } from "@taxkit/api-rpc/schemas";
import { Array, Option, Result, Schema } from "effect";
import { createContext, useMemo } from "react";

import { publicSettingsAtom } from "#/lib/calculator.atoms";
import type { RouterContext } from "#/lib/route-context";
import {
  WebsiteSettingsTransport,
  WebsiteCatalogueTransport,
  WebsiteSubmissionTransport,
} from "#/lib/schemas";
import type { WebsiteSubmission } from "#/lib/schemas";

import "../styles.css";

// Only the root route restores this transport. Children receive checked values.
export const WebsiteSubmissionContext = createContext<
  Option.Option<typeof WebsiteSubmission.Type>
>(Option.none());
export const WebsiteCatalogueContext = createContext<
  Option.Option<typeof CalculatorCatalogResponse.Type>
>(Option.none());

const RootShell = ({ children }: { readonly children: React.ReactNode }) => (
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
const RootComponent = () => {
  const data = useLoaderData({ from: "__root__" });
  const settings = useMemo(
    () => Schema.decodeUnknownResult(WebsiteSettingsTransport)(data.settings),
    [data.settings]
  );
  const submission = useMemo(
    () =>
      data.submission === undefined
        ? Option.none<typeof WebsiteSubmission.Type>()
        : Schema.decodeResult(WebsiteSubmissionTransport)(data.submission).pipe(
            Result.getSuccess
          ),
    [data.submission]
  );
  const catalogue = useMemo(
    () =>
      Schema.decodeUnknownResult(WebsiteCatalogueTransport)(
        data.catalogue
      ).pipe(
        Result.match({
          onFailure: () => Option.none<typeof CalculatorCatalogResponse.Type>(),
          onSuccess: Result.getSuccess,
        })
      ),
    [data.catalogue]
  );
  if (Result.isFailure(settings) || Result.isFailure(settings.success)) {
    return (
      <main className="home">
        <h1>TaxKit</h1>
        <p role="alert">
          TaxKit cannot load its settings. Please try again later.
        </p>
      </main>
    );
  }
  const checked = settings.success.success;
  return (
    <RegistryProvider
      key={checked.apiOrigin.href}
      initialValues={[[publicSettingsAtom, Option.some(checked)]]}
    >
      <WebsiteSubmissionContext.Provider value={submission}>
        <WebsiteCatalogueContext.Provider value={catalogue}>
          <div className="app-shell">
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <nav aria-label="Calculators">
              {Option.match(catalogue, {
                onNone: () => (
                  <p>
                    The calculator list could not load. Please reload this page.
                  </p>
                ),
                onSome: (value) => (
                  <ul>
                    {Array.map(value.calculators, (calculator) => (
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
                ),
              })}
              <a href={new URL("/api/docs", checked.apiOrigin).href}>
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
        </WebsiteCatalogueContext.Provider>
      </WebsiteSubmissionContext.Provider>
    </RegistryProvider>
  );
};
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
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
  loader: ({ context, abortController, serverContext }) =>
    context.loadSettings({
      signal: abortController.signal,
      submission: serverContext?.submission,
    }),
  shellComponent: RootShell,
});
