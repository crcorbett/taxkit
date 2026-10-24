import { describe, expect, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { vi } from "vitest";

import {
  WebsiteSettingsConfig,
  WebsiteApiConfig,
  WebsiteBindings,
} from "../../src/lib/host/config.server";
import {
  TaxKitWebConfigError,
  WebsiteApiConfigError,
} from "../../src/lib/host/errors";
import { WebsiteRootView } from "../../src/lib/host/schemas";

const binding = {
  connect: vi.fn<(...args: readonly unknown[]) => void>(),
  fetch: vi.fn<(...args: readonly unknown[]) => void>(),
};
const settings = {
  API_PUBLIC_ORIGIN: "https://api.taxkit.example",
  TAXKIT_API: binding,
  TAXKIT_PUBLICATION_ORIGIN: "https://taxkit.example",
  UNRELATED_SECRET: "secret-canary",
  WEBSITE_PUBLIC_ORIGIN: "https://preview.taxkit.example",
};

describe("native website settings boundary", () => {
  it.effect(
    "retains the binding receiver and restores checked origins from JSON",
    () =>
      Effect.gen(function* () {
        const checked = yield* WebsiteSettingsConfig.pipe(
          Effect.provideService(WebsiteBindings, settings)
        );
        const api = yield* WebsiteApiConfig.pipe(
          Effect.provideService(WebsiteBindings, settings)
        );
        expect(api.binding).toBe(binding);
        expect(checked.apiOrigin.href).toBe("https://api.taxkit.example/");
        expect(checked.publicationOrigin.href).toBe("https://taxkit.example/");
        expect(checked.websiteOrigin.href).toBe(
          "https://preview.taxkit.example/"
        );
        const encoded = yield* Schema.encodeEffect(
          Schema.fromJsonString(WebsiteRootView)
        )({ settings: checked });
        expect(encoded).not.toContain("secret-canary");
        const restored = yield* Schema.decodeUnknownEffect(
          Schema.fromJsonString(WebsiteRootView)
        )(encoded);
        expect(restored.settings.apiOrigin).toBeInstanceOf(URL);
        expect(restored.settings.websiteOrigin.href).toBe(
          "https://preview.taxkit.example/"
        );
      })
  );

  it.effect.each([
    { ...settings, API_PUBLIC_ORIGIN: undefined },
    {
      ...settings,
      API_PUBLIC_ORIGIN:
        "https://api.taxkit.example/secret-canary?token=secret-canary",
    },
    { ...settings, WEBSITE_PUBLIC_ORIGIN: "secret-canary" },
    { ...settings, TAXKIT_PUBLICATION_ORIGIN: undefined },
  ])(
    "rejects missing or invalid settings without carrying raw input",
    (input) =>
      Effect.gen(function* () {
        const checked = yield* WebsiteSettingsConfig.pipe(
          Effect.provideService(WebsiteBindings, input),
          Effect.result
        );
        // The whole failure is the fixed safe value: no input, path or cause.
        expect(checked).toStrictEqual(
          Result.fail(
            new TaxKitWebConfigError({
              message: "TaxKit web settings are missing or invalid.",
              operation: "settings",
              runtime: "server",
            })
          )
        );
      })
  );
});

it.effect.each([
  { apiValid: true, changed: {}, settingsValid: true },
  { apiValid: false, changed: { TAXKIT_API: {} }, settingsValid: true },
  {
    apiValid: false,
    changed: { TAXKIT_API: "secret-canary" },
    settingsValid: true,
  },
  {
    apiValid: true,
    changed: { WEBSITE_PUBLIC_ORIGIN: "secret-canary" },
    settingsValid: false,
  },
  {
    apiValid: true,
    changed: { TAXKIT_PUBLICATION_ORIGIN: undefined },
    settingsValid: false,
  },
  {
    apiValid: false,
    changed: { API_PUBLIC_ORIGIN: "secret-canary" },
    settingsValid: false,
  },
])(
  "keeps settings and API failures independent for $changed",
  ({ changed, settingsValid, apiValid }) =>
    Effect.gen(function* () {
      const input = { ...settings, ...changed };
      const publicSettings = yield* WebsiteSettingsConfig.pipe(
        Effect.provideService(WebsiteBindings, input),
        Effect.result
      );
      const api = yield* WebsiteApiConfig.pipe(
        Effect.provideService(WebsiteBindings, input),
        Effect.result
      );
      expect(Result.isSuccess(publicSettings)).toBe(settingsValid);
      expect(Result.isSuccess(api)).toBe(apiValid);
      if (Result.isFailure(api)) {
        expect(api.failure._tag).toBe("WebsiteApiConfigError");
        expect(api.failure.message).toBe(
          "TaxKit API settings are missing or invalid."
        );
        expect(api.failure).toEqual(new WebsiteApiConfigError());
      }
    })
);
