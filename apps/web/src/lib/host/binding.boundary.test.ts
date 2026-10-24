import { expect, it } from "@effect/vitest";
import { Effect, Layer, Result, Schema } from "effect";
import { vi } from "vitest";

import { loadRootView } from "../pages/root.load.server";
import { WebsiteApiLive } from "./binding.server";
import { WebsiteBindings } from "./config.server";
import { WebsiteRootView } from "./schemas";
import { WebsiteApi, WebsiteSettings } from "./service";
import { WebsiteSettingsLive } from "./settings.server.layer";

const binding = {
  connect: vi.fn<(...args: readonly unknown[]) => void>(),
  fetch: vi.fn(() => Promise.resolve(new Response("User-agent: *"))),
};
const valid = {
  API_PUBLIC_ORIGIN: "https://api.taxkit.example",
  TAXKIT_API: binding,
  TAXKIT_PUBLICATION_ORIGIN: "https://taxkit.example",
  WEBSITE_PUBLIC_ORIGIN: "https://preview.taxkit.example",
};

it.effect.each([
  { apiValid: true, changed: {}, settingsValid: true },
  { apiValid: false, changed: { TAXKIT_API: {} }, settingsValid: true },
  {
    apiValid: true,
    changed: { WEBSITE_PUBLIC_ORIGIN: "invalid" },
    settingsValid: false,
  },
  {
    apiValid: true,
    changed: { TAXKIT_PUBLICATION_ORIGIN: "invalid" },
    settingsValid: false,
  },
  {
    apiValid: false,
    changed: { API_PUBLIC_ORIGIN: "invalid" },
    settingsValid: false,
  },
])(
  "constructs independent host capabilities for $changed",
  ({ changed, settingsValid, apiValid }) =>
    Effect.gen(function* () {
      const settings = yield* WebsiteSettings;
      const api = yield* WebsiteApi;
      const forward = yield* api
        .forward("/api/v1/docs/discovery/robots.txt")
        .pipe(Effect.result);
      expect(Result.isSuccess(settings.settings)).toBe(settingsValid);
      expect(Result.isSuccess(api.client)).toBe(apiValid);
      expect(Result.isSuccess(forward)).toBe(apiValid);
      if (Result.isSuccess(forward)) {
        expect(yield* Effect.promise(() => forward.success.text())).toBe(
          "User-agent: *"
        );
      }
      if (!apiValid && settingsValid) {
        // A broken binding leaves the root loader's public settings available.
        const loaded = yield* loadRootView;
        const root = yield* Schema.decodeUnknownEffect(WebsiteRootView)(
          loaded.view
        );
        expect(root.settings.websiteOrigin.origin).toBe(
          "https://preview.taxkit.example"
        );
      }
    }).pipe(
      Effect.provide(
        Layer.mergeAll(WebsiteSettingsLive, WebsiteApiLive).pipe(
          Layer.provide(
            Layer.succeed(WebsiteBindings)({ ...valid, ...changed })
          )
        )
      )
    )
);
