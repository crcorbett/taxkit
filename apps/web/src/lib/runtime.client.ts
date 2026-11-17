import type { AnyRedirect } from "@tanstack/react-router";
import { clientToolHandlers } from "@taxkit/api-mcp/client-handlers";
import { TaxKitMcpToolkit } from "@taxkit/api-mcp/tools";
import { ModelContextHostLive } from "@taxkit/webmcp/host";
import { registerWebMcpTools } from "@taxkit/webmcp/registration";
import { WebMcpSite } from "@taxkit/webmcp/service";
import { Effect, Layer, Option } from "effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import {
  ApiClient,
  apiClientRuntime,
  browserApiClient,
  browserRuntime,
  browserSettings,
  browserSettingsUnavailable,
  publicSettingsAtom,
} from "./api-client.atoms";
import type { WebsiteDocsSearchQuery } from "./docs/search-location.ingress";
import { loadCalculatorView } from "./pages/calculator.load";
import { loadDocsPageView, loadDocsSearchView } from "./pages/docs.load";
import type { RouteLoadFailure } from "./pages/load.failure";
import type { LoaderContext } from "./pages/loader-context";
import { loadRootView } from "./pages/root.load";

// WebMCP shares the API MCP tool definitions; its handlers call the public API
// through the same generated client as route loaders.
const BrowserToolHandlers = TaxKitMcpToolkit.toLayer(
  ApiClient.pipe(Effect.map(clientToolHandlers))
);
/**
 * The Website's one WebMCP registration, mounted once at the app root.
 * Mounting builds the host adapter and client-backed handlers in this Atom's
 * Scope and registers every API MCP tool; unmounting closes the Scope, which
 * unregisters them and interrupts running calls. The shared client stays
 * open. Without settings there is no checked origin, so nothing registers.
 */
export const webMcpAtom = browserRuntime.atom((get) =>
  Option.match(get(publicSettingsAtom), {
    onNone: () => Effect.void,
    onSome: (settings) =>
      get.result(apiClientRuntime, { suspendOnWaiting: true }).pipe(
        Effect.flatMap((services) =>
          Layer.build(
            Layer.mergeAll(
              ModelContextHostLive.pipe(
                Layer.provide(
                  Layer.succeed(WebMcpSite)({
                    origin: settings.websiteOrigin,
                  })
                )
              ),
              BrowserToolHandlers.pipe(
                Layer.provide(Layer.succeedContext(services))
              )
            )
          )
        ),
        Effect.flatMap((services) =>
          registerWebMcpTools.pipe(Effect.provide(services))
        )
      ),
  })
);
// TanStack's one browser Promise bridge. It runs a translated route load with
// the shared registry and the loader's own AbortSignal. Route results belong
// to the router; there is no request Atom or second cache.
const runForLoader = <A>({
  context,
  effect,
  signal,
}: Readonly<{
  context: LoaderContext;
  effect: Effect.Effect<
    A,
    RouteLoadFailure | AnyRedirect,
    AtomRegistry.AtomRegistry
  >;
  signal: AbortSignal;
}>) =>
  Effect.runPromise(
    Effect.fromOption(context.registry).pipe(
      Effect.flatMap((registry) =>
        effect.pipe(Effect.provideService(AtomRegistry.AtomRegistry, registry))
      ),
      // A browser loader always has the registry created with its router.
      Effect.catchTag("NoSuchElementError", () =>
        Effect.die(browserSettingsUnavailable)
      )
    ),
    { signal }
  );
export const loadRoot = (
  request: Readonly<{
    context: LoaderContext;
    signal: AbortSignal;
  }>
) => runForLoader({ ...request, effect: loadRootView(browserSettings) });
export const loadCalculatorPage = (
  request: Readonly<{
    calculatorId: string;
    context: LoaderContext;
    signal: AbortSignal;
  }>
) =>
  runForLoader({
    ...request,
    effect: loadCalculatorView({ calculatorId: request.calculatorId }),
  });
export const loadDocsPage = (
  request: Readonly<{
    context: LoaderContext;
    path: string;
    signal: AbortSignal;
  }>
) =>
  runForLoader({
    ...request,
    effect: loadDocsPageView({
      client: browserApiClient,
      path: request.path,
      settings: browserSettings,
    }),
  });
export const loadDocsSearch = (
  request: Readonly<{
    context: LoaderContext;
    query: WebsiteDocsSearchQuery;
    signal: AbortSignal;
  }>
) =>
  runForLoader({
    ...request,
    effect: loadDocsSearchView({
      client: browserApiClient,
      query: request.query,
    }),
  });
