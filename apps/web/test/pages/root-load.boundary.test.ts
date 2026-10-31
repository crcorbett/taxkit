import { expect, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";

import { TaxKitWebConfigError } from "../../src/lib/host/errors";
import {
  WebsitePublicSettings,
  WebsiteRootView,
} from "../../src/lib/host/schemas";
import { WebsiteSettings } from "../../src/lib/host/service";
import { loadRootView } from "../../src/lib/pages/root.load";

it.effect("loads settings without an API capability", () =>
  Effect.gen(function* () {
    const settings = yield* Schema.decodeUnknownEffect(WebsitePublicSettings)({
      apiOrigin: "https://api.taxkit.example",
      publicationOrigin: "https://taxkit.example",
      websiteOrigin: "https://preview.taxkit.example",
    });
    const loaded = yield* loadRootView.pipe(
      Effect.provideService(WebsiteSettings, {
        settings: Effect.succeed(settings).pipe(
          Effect.withSpan("WebsiteSettings.settings")
        ),
      })
    );
    const view = yield* Schema.decodeUnknownEffect(WebsiteRootView)(
      loaded.view
    );
    expect(view.settings.websiteOrigin.href).toBe(
      "https://preview.taxkit.example/"
    );
  })
);
it.effect("keeps invalid required settings as a root failure", () =>
  Effect.gen(function* () {
    const failure = new TaxKitWebConfigError({
      message: "TaxKit web settings are missing or invalid.",
      operation: "settings",
      runtime: "server",
    });
    const loaded = yield* loadRootView.pipe(
      Effect.provideService(WebsiteSettings, {
        settings: Effect.fail(failure).pipe(
          Effect.withSpan("WebsiteSettings.settings")
        ),
      }),
      Effect.result
    );
    expect(loaded).toStrictEqual(Result.fail(failure));
  })
);
