import { expect, it } from "@effect/vitest";
import { Cause, Effect, Exit, Result, Schema } from "effect";

import {
  TaxKitWebConfigError,
  WebsiteLoadError,
} from "../../src/lib/host/errors";
import {
  WebsitePublicSettings,
  WebsiteRootView,
} from "../../src/lib/host/schemas";
import { loadRootView } from "../../src/lib/pages/root.load";

it.effect("loads settings without an API capability", () =>
  Effect.gen(function* () {
    const settings = yield* Schema.decodeUnknownEffect(WebsitePublicSettings)({
      apiOrigin: "https://api.taxkit.example",
      publicationOrigin: "https://taxkit.example",
      websiteOrigin: "https://preview.taxkit.example",
    });
    const loaded = yield* Effect.succeed(settings).pipe(loadRootView);
    const view = yield* Schema.decodeUnknownEffect(WebsiteRootView)(
      loaded.view
    );
    expect(view.settings.websiteOrigin.href).toBe(
      "https://preview.taxkit.example/"
    );
  })
);
it.effect("translates invalid required settings to a 503 root failure", () =>
  Effect.gen(function* () {
    const loaded = yield* Effect.fail(
      new TaxKitWebConfigError({
        message: "TaxKit web settings are missing or invalid.",
        operation: "settings",
        runtime: "server",
      })
    ).pipe(loadRootView, Effect.result);
    expect(loaded).toStrictEqual(
      Result.fail(new WebsiteLoadError({ status: 503 }))
    );
  })
);
it.effect("keeps a settings defect as a defect with only the safe value", () =>
  Effect.gen(function* () {
    const exit = yield* Effect.die("PRIVATE9").pipe(loadRootView, Effect.exit);
    const outcome = Exit.match(exit, {
      onFailure: (cause) => ({
        defect: Cause.squash(cause),
        dies: Cause.hasDies(cause),
      }),
      onSuccess: () => "loaded",
    });
    expect(outcome).toStrictEqual({
      defect: new WebsiteLoadError({ status: 500 }),
      dies: true,
    });
  })
);
