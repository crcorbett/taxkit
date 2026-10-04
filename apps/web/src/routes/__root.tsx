import { RegistryProvider } from "@effect/atom-react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLoaderData,
} from "@tanstack/react-router";
import { Option, Result, Schema } from "effect";
import { createContext, useMemo } from "react";

import { publicSettingsAtom, takeHomeFormAtom } from "#/lib/calculator.atoms";
import type { RouterContext } from "#/lib/route-context";
import {
  WebsiteSettingsTransport,
  WebsiteSubmissionTransport,
} from "#/lib/schemas";
import type { WebsiteSubmission } from "#/lib/schemas";

import "../styles.css";

// Only the root route restores this transport. Children receive checked values.
export const WebsiteSubmissionContext = createContext<
  Option.Option<typeof WebsiteSubmission.Type>
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
  const submittedForm = submission.pipe(Option.map((value) => value.form));
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
      initialValues={Option.match(submittedForm, {
        onNone: () => [[publicSettingsAtom, Option.some(checked)]],
        onSome: (form) => [
          [publicSettingsAtom, Option.some(checked)],
          [takeHomeFormAtom, form],
        ],
      })}
    >
      <WebsiteSubmissionContext.Provider value={submission}>
        <main className="app-shell">
          <Outlet />
        </main>
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
      { content: "Calculate Australian take-home pay.", name: "description" },
    ],
  }),
  loader: ({ context, abortController, serverContext }) =>
    context.loadSettings({
      signal: abortController.signal,
      submission: serverContext?.submission,
    }),
  shellComponent: RootShell,
});
