import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, Result, Schema } from "effect";
import { vi } from "vitest";

import { TaxKitWebConfigError } from "./config";
import { TaxKitWebServerConfig, WebsiteBindings } from "./config.server";
import { WebsiteRootView } from "./schemas";

const binding = {
  calculatorRequest: vi.fn(),
  connect: vi.fn(),
  fetch: vi.fn(),
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
        const checked = yield* TaxKitWebServerConfig.pipe(
          Effect.provideService(WebsiteBindings, settings)
        );
        expect(checked.binding).toBe(binding);
        expect(checked.apiOrigin.href).toBe("https://api.taxkit.example/");
        expect(checked.publicationOrigin.href).toBe("https://taxkit.example/");
        expect(checked.websiteOrigin.href).toBe(
          "https://preview.taxkit.example/"
        );
        const encoded = yield* Schema.encodeEffect(
          Schema.fromJsonString(WebsiteRootView)
        )({ catalogue: Option.none(), settings: checked });
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
    { ...settings, TAXKIT_API: { fetch: vi.fn() } },
    { ...settings, TAXKIT_API: "secret-canary" },
  ])(
    "rejects missing or invalid settings without carrying raw input",
    (input) =>
      Effect.gen(function* () {
        const checked = yield* TaxKitWebServerConfig.pipe(
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
