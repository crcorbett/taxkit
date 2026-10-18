import "@tanstack/react-start/server-only";
import { Effect, Schema } from "effect";

import { WebsiteSettings } from "./host.service";
import { WebsiteRootView } from "./schemas";
import type { WebsiteServerRenderContext } from "./schemas";

// Root loading requires only public settings and this request's submission.
// Navigation uses the deployed calculator summaries, with no remote read.
export const loadRootView = Effect.fn("Website.loadRootView")(function* (
  submission?: WebsiteServerRenderContext["submission"]
) {
  const host = yield* WebsiteSettings;
  const settings = yield* Effect.fromResult(host.settings);
  return {
    submission,
    view: yield* Schema.encodeEffect(WebsiteRootView)({ settings }),
  };
});
