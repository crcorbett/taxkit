import "@tanstack/react-start/server-only";
import { Effect, Layer } from "effect";

import { WebsiteSettingsConfig } from "./config.ingress";
import { WebsiteSettings } from "./service";

export const WebsiteSettingsLive = Layer.effect(
  WebsiteSettings,
  WebsiteSettingsConfig.pipe(
    Effect.result,
    Effect.map((settings) =>
      WebsiteSettings.of({
        settings: Effect.fromResult(settings).pipe(
          Effect.withSpan("WebsiteSettings.settings")
        ),
      })
    )
  )
);
