import { requestDocsPage, requestDocsSearch } from "@taxkit/api-http/requests";
import { clientToolHandlers } from "@taxkit/api-mcp/client-handlers";
import { TaxKitMcpToolkit } from "@taxkit/api-mcp/tools";
import { docsPageMetadata } from "@taxkit/content/publication";
import { ModelContextHostLive } from "@taxkit/webmcp/host";
import { registerWebMcpTools } from "@taxkit/webmcp/registration";
import { WebMcpSite } from "@taxkit/webmcp/service";
import { Effect, Layer, Option, Schema } from "effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import {
  ApiClient,
  apiClientRuntime,
  browserApiClient,
  browserRuntime,
  publicSettingsAtom,
} from "./api-client.atoms";
import { WebsiteDocsSearchView } from "./docs/schemas";
import type { WebsiteDocsSearchQuery } from "./docs/search-location.ingress";
import { TaxKitWebConfigError } from "./host/errors";
import { WebsiteRootView } from "./host/schemas";
import { loadCalculatorView } from "./pages/calculator.load";
import { rejectRouteLoad } from "./pages/load.failure";
import type { LoaderContext } from "./pages/loader-context";

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
const settingsUnavailable = new TaxKitWebConfigError({
  message: "TaxKit web settings are missing or invalid.",
  operation: "settings",
  runtime: "client",
});
// TanStack's one browser Promise bridge. It runs a request Effect with the
// shared registry and the loader's own AbortSignal. Route results belong to
// the router; there is no request Atom or second cache.
const runForLoader = <A, E>({
  context,
  effect,
  signal,
}: Readonly<{
  context: LoaderContext;
  effect: Effect.Effect<A, E, AtomRegistry.AtomRegistry>;
  signal: AbortSignal;
}>) =>
  Effect.runPromise(
    Effect.fromOption(context.registry).pipe(
      Effect.mapError(() => settingsUnavailable),
      Effect.flatMap((registry) =>
        effect.pipe(Effect.provideService(AtomRegistry.AtomRegistry, registry))
      ),
      Effect.catchCause(rejectRouteLoad)
    ),
    { signal }
  );
const settings = AtomRegistry.AtomRegistry.pipe(
  Effect.map((registry) => registry.get(publicSettingsAtom)),
  Effect.flatMap(Effect.fromOption),
  Effect.mapError(() => settingsUnavailable)
);
export const loadRoot = (
  request: Readonly<{
    context: LoaderContext;
    signal: AbortSignal;
  }>
) =>
  runForLoader({
    ...request,
    effect: Effect.gen(function* () {
      const current = yield* settings;
      return {
        view: yield* Schema.encodeEffect(WebsiteRootView)({
          settings: current,
        }),
      };
    }),
  });
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
    effect: Effect.gen(function* () {
      const current = yield* settings;
      const client = yield* browserApiClient;
      const { navigation, page } = yield* requestDocsPage({
        client,
        address: request.path,
      });
      return {
        metadata: yield* docsPageMetadata({
          page,
          origin: current.publicationOrigin,
        }),
        navigation,
        page,
      };
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
    effect: Effect.fromResult(request.query).pipe(
      Effect.matchEffect({
        onFailure: () => Effect.succeed(WebsiteDocsSearchView.InvalidSearch()),
        onSuccess: (term) =>
          browserApiClient.pipe(
            Effect.flatMap((client) =>
              Effect.all(
                {
                  results: requestDocsSearch({ client, term }),
                  home: requestDocsPage({
                    client,
                    address: "/start/quickstart",
                  }),
                },
                { concurrency: "unbounded" }
              )
            ),
            Effect.map(({ results, home }) =>
              WebsiteDocsSearchView.Found({
                navigation: home.navigation,
                results,
                term,
                theme: home.page.theme,
              })
            )
          ),
      })
    ),
  });
