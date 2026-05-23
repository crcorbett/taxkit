import type { WhatTaxHttpApiService } from "@whattax/http-api/client";
import type { Effect, Exit } from "effect";

export interface WhatTaxRouteRuntime {
  readonly runPromise: <A, E>(
    effect: Effect.Effect<A, E, WhatTaxHttpApiService>
  ) => Promise<A>;
  readonly runPromiseExit: <A, E>(
    effect: Effect.Effect<A, E, WhatTaxHttpApiService>
  ) => Promise<Exit.Exit<A, E>>;
}

export interface RouterContext {
  readonly api: WhatTaxRouteRuntime;
}

export interface RouteLoaderContext {
  readonly context: RouterContext;
}

export const getRouteRuntime = ({ context }: RouteLoaderContext) => context.api;
