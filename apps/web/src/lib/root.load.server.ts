import "@tanstack/react-start/server-only";
import { Effect, Schema } from "effect";

import { readCatalogue } from "./api/requests";
import { WebsiteApi, WebsiteSettings } from "./host.service";
import { WebsiteRootView } from "./schemas";
import type { WebsiteServerRenderContext } from "./schemas";

// Root loading owns the distinction between required public settings and the
// optional API catalogue. The host runtime supplies cancellation and egress.
export const loadRootView = Effect.fn("Website.loadRootView")(function* (
  submission?: WebsiteServerRenderContext["submission"]
) {
  const host = yield* WebsiteSettings;
  const settings = yield* Effect.fromResult(host.settings);
  // The catalogue is optional page chrome; its absence is shown in place.
  const api = yield* WebsiteApi;
  const catalogue = yield* Effect.fromResult(api.client).pipe(
    Effect.flatMap(readCatalogue),
    Effect.option
  );
  return {
    submission,
    view: yield* Schema.encodeEffect(WebsiteRootView)({ catalogue, settings }),
  };
});
