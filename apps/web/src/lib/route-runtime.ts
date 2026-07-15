import type { TaxKitHttpApiService } from "@taxkit/api-http/client";
import type { Effect, Exit } from "effect";

import type { TaxKitWebConfigError } from "./config";

export interface TaxKitRouteRuntime {
  readonly runPromise: <A, E>(
    effect: Effect.Effect<A, E, TaxKitHttpApiService>
  ) => Promise<A>;
  readonly runPromiseExit: <A, E>(
    effect: Effect.Effect<A, E, TaxKitHttpApiService>
  ) => Promise<Exit.Exit<A, E | TaxKitWebConfigError>>;
}

export interface RouterContext {
  readonly api: TaxKitRouteRuntime;
}

export interface RouteLoaderContext {
  readonly context: RouterContext;
}

export const getRouteRuntime = ({ context }: RouteLoaderContext) => context.api;
