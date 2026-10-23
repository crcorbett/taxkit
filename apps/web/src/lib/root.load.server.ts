import "@tanstack/react-start/server-only";
import { Effect, Schema } from "effect";

import { WebsiteSettings } from "./host.service";
import { WebsiteRootView } from "./schemas";

// Root loading requires only public settings. Navigation uses the deployed
// calculator summaries, with no remote read.
export const loadRootView = Effect.gen(function* () {
  const host = yield* WebsiteSettings;
  const settings = yield* Effect.fromResult(host.settings);
  return {
    view: yield* Schema.encodeEffect(WebsiteRootView)({ settings }),
  };
}).pipe(Effect.withSpan("Website.loadRootView"));
