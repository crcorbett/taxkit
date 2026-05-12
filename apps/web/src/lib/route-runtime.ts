import type { WhatTaxHttpApiService } from "@whattax/http-api/client";
import type { Effect, Exit } from "effect";

interface WhatTaxRouteRuntime {
  readonly runPromise: <A, E>(
    effect: Effect.Effect<A, E, WhatTaxHttpApiService>
  ) => Promise<A>;
  readonly runPromiseExit: <A, E>(
    effect: Effect.Effect<A, E, WhatTaxHttpApiService>
  ) => Promise<Exit.Exit<A, E>>;
}

export interface WhatTaxServerContext {
  readonly api: WhatTaxRouteRuntime;
  readonly handleApiRequest: (request: Request) => Promise<Response>;
}

export interface RouterContext {
  readonly api: WhatTaxRouteRuntime;
  readonly serverContext?: WhatTaxServerContext | undefined;
}

export interface RouteLoaderContext {
  readonly context: RouterContext;
  readonly serverContext?: WhatTaxServerContext | undefined;
}

export const getRouteRuntime = ({
  context,
  serverContext,
}: RouteLoaderContext) =>
  serverContext?.api ?? context.serverContext?.api ?? context.api;
