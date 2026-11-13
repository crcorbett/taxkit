import { Effect, Layer } from "effect";

import { WebsiteSettings } from "../../../src/lib/host/service";

// The native settings-defect build's settings Layer: every settings read is
// an internal defect, so the root loader's defect handling runs on a plain
// page request.
export const WebsiteSettingsLive = Layer.succeed(
  WebsiteSettings,
  WebsiteSettings.of({
    settings: Effect.die("PRIVATE9").pipe(
      Effect.withSpan("WebsiteSettings.settings")
    ),
  })
);
