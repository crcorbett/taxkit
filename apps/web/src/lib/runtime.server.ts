import { isNotFound } from "@tanstack/react-router";
import type { AnyRedirect } from "@tanstack/react-router";
import "@tanstack/react-start/server-only";
import { setResponseStatus } from "@tanstack/react-start/server";
import { WebsiteHostTelemetryLive } from "@taxkit/observability/host-telemetry";
import { env } from "cloudflare:workers";
import { Effect, Layer, ManagedRuntime, Match, Option, Schema } from "effect";

import type { WebsiteDocsSearchQuery } from "./docs/search-location.ingress";
import { WebsiteApiLive } from "./host/binding.adapter.layer";
import { WebsiteBindings } from "./host/config.ingress";
import { WebsiteLoadError } from "./host/errors";
import { WebsiteApi, WebsiteSettings } from "./host/service";
import { WebsiteSettingsLive } from "./host/settings.layer";
import { loadCalculatorView } from "./pages/calculator.load";
import { loadDocsPageView, loadDocsSearchView } from "./pages/docs.load";
import type { RouteLoadFailure } from "./pages/load.failure";
import { loadRootView } from "./pages/root.load";
// The Worker's bindings object, read at this host edge only.
const bindings = Layer.sync(WebsiteBindings, () => ({ ...env }));
// One server runner per loaded Worker module. It supplies native API clients,
// never a backend implementation; each request supplies its own signal.
export const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    WebsiteApiLive,
    WebsiteSettingsLive,
    WebsiteHostTelemetryLive
  ).pipe(Layer.provide(bindings))
);
const settings = WebsiteSettings.pipe(Effect.flatMap((host) => host.settings));
const client = WebsiteApi.pipe(Effect.flatMap((host) => host.client));
// Server loads report their HTTP status before TanStack renders the native
// not-found or error component. A redirect keeps its own status; a defect
// already carries only the safe 500 value; cancellation stays interruption.
const runServerLoad =
  (signal: AbortSignal) =>
  <A>(
    effect: Effect.Effect<
      A,
      RouteLoadFailure | AnyRedirect,
      WebsiteApi | WebsiteSettings
    >
  ) =>
    runtime.runPromise(
      effect.pipe(
        Effect.tapError((failure) =>
          Match.value(failure).pipe(
            Match.when(Schema.is(WebsiteLoadError), ({ status }) =>
              Option.some(status)
            ),
            Match.when(isNotFound, () => Option.some(404)),
            Match.orElse(() => Option.none()),
            Effect.fromOption,
            Effect.flatMap((status) =>
              Effect.sync(() => {
                setResponseStatus(status);
              })
            ),
            Effect.ignore
          )
        ),
        Effect.tapDefect(() =>
          Effect.sync(() => {
            setResponseStatus(500);
          })
        )
      ),
      { signal }
    );
export const loadRoot = ({ signal }: Readonly<{ signal: AbortSignal }>) =>
  settings.pipe(loadRootView, runServerLoad(signal));
export const loadCalculatorPage = ({
  calculatorId,
  signal,
}: Readonly<{
  calculatorId: string;
  signal: AbortSignal;
}>) => loadCalculatorView({ calculatorId }).pipe(runServerLoad(signal));
export const loadDocsPage = ({
  path,
  signal,
}: Readonly<{
  path: string;
  signal: AbortSignal;
}>) => loadDocsPageView({ client, path, settings }).pipe(runServerLoad(signal));
export const loadDocsSearch = ({
  query,
  signal,
}: Readonly<{
  query: WebsiteDocsSearchQuery;
  signal: AbortSignal;
}>) => loadDocsSearchView({ client, query }).pipe(runServerLoad(signal));
