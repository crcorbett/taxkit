import type { WhatTaxHttpApiService } from "@whattax/http-api/client";
import type { Effect, Exit } from "effect";

export type WhatTaxRouteRuntime = {
  readonly runPromise: <A, E>(
    effect: Effect.Effect<A, E, WhatTaxHttpApiService>
  ) => Promise<A>;
  readonly runPromiseExit: <A, E>(
    effect: Effect.Effect<A, E, WhatTaxHttpApiService>
  ) => Promise<Exit.Exit<A, E>>;
};

export type WhatTaxServerContext = {
  readonly api: WhatTaxRouteRuntime;
  readonly handleApiRequest: (request: Request) => Promise<Response>;
};

export type RouterContext = {
  readonly api: WhatTaxRouteRuntime;
  readonly serverContext?: WhatTaxServerContext | undefined;
};

export type RouteLoaderContext = {
  readonly context: RouterContext;
  readonly serverContext?: WhatTaxServerContext | undefined;
};

export const getRouteRuntime = ({ context, serverContext }: RouteLoaderContext) =>
  serverContext?.api ?? context.serverContext?.api ?? context.api;
