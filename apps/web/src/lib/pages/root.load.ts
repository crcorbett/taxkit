import { Effect, Schema } from "effect";

import type { TaxKitWebConfigError } from "../host/errors";
import { WebsiteRootView } from "../host/schemas";
import type { WebsitePublicSettings } from "../host/schemas";
import { routeLoadFailures, withSafeDefects } from "./load.failure";
import type { RouteLoadFailure } from "./load.failure";

// Root loading requires only public settings, read by each runtime its own
// way. Navigation uses the deployed calculator summaries, with no remote read.
export const loadRootView = <R>(
  settings: Effect.Effect<WebsitePublicSettings, TaxKitWebConfigError, R>
): Effect.Effect<
  { readonly view: typeof WebsiteRootView.Encoded },
  RouteLoadFailure,
  R
> =>
  settings.pipe(
    Effect.flatMap((current) =>
      Schema.encodeEffect(WebsiteRootView)({ settings: current })
    ),
    Effect.map((view) => ({ view })),
    Effect.catchTags(
      routeLoadFailures({
        SchemaError: "invalid-reply",
        TaxKitWebConfigError: "unavailable",
      })
    ),
    withSafeDefects,
    Effect.withSpan("Website.loadRootView")
  );
