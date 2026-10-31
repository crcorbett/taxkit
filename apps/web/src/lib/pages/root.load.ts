import "@tanstack/react-start/server-only";
import { Effect, Schema } from "effect";

import { WebsiteRootView } from "../host/schemas";
import { WebsiteSettings } from "../host/service";

// Root loading requires only public settings. Navigation uses the deployed
// calculator summaries, with no remote read.
export const loadRootView = Effect.gen(function* () {
  const host = yield* WebsiteSettings;
  const settings = yield* host.settings;
  return {
    view: yield* Schema.encodeEffect(WebsiteRootView)({ settings }),
  };
}).pipe(Effect.withSpan("Website.loadRootView"));
