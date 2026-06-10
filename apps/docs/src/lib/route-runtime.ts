import type { DocsContentService } from "@whattax/docs-content/service";
import type { Effect, Exit } from "effect";

export interface DocsRouteRuntime {
  readonly runPromise: <A, E>(
    effect: Effect.Effect<A, E, DocsContentService>
  ) => Promise<A>;
  readonly runPromiseExit: <A, E>(
    effect: Effect.Effect<A, E, DocsContentService>
  ) => Promise<Exit.Exit<A, E>>;
}

export interface RouterContext {
  readonly docs: DocsRouteRuntime;
}

export interface RouteLoaderContext {
  readonly context: RouterContext;
}
