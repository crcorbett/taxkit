import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Result, Schema } from "effect";
import { vi } from "vitest";

import { TaxKitWebServerConfig } from "./config.server";
import { WebsitePublicSettings, WebsiteSettingsTransport } from "./schemas";

const binding = {
  calculatorRequest: vi.fn(),
  connect: vi.fn(),
  fetch: vi.fn(),
};
const settings = {
  API_PUBLIC_ORIGIN: "https://api.taxkit.example",
  TAXKIT_API: binding,
  WEBSITE_PUBLIC_ORIGIN: "https://taxkit.example",
};
describe("native website settings boundary", () => {
  it.effect(
    "retains the binding receiver and restores branded origins through JSON",
    () =>
      Effect.gen(function* () {
        const checked = yield* TaxKitWebServerConfig(binding).pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromUnknown(settings)
          )
        );
        expect(checked.binding).toBe(binding);
        expect(checked.apiOrigin.href).toBe("https://api.taxkit.example/");
        const encoded = yield* Schema.encodeEffect(
          Schema.fromJsonString(WebsiteSettingsTransport)
        )(
          Result.succeed(
            WebsitePublicSettings.make({ apiOrigin: checked.apiOrigin })
          )
        );
        const restored = yield* Schema.decodeUnknownEffect(
          Schema.fromJsonString(WebsiteSettingsTransport)
        )(encoded);
        expect(Result.isSuccess(restored)).toBe(true);
        if (Result.isSuccess(restored)) {
          expect(restored.success.apiOrigin).toBeInstanceOf(URL);
        }
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
    { ...settings, TAXKIT_API: { fetch: vi.fn() } },
    { ...settings, TAXKIT_API: "secret-canary" },
  ])(
    "rejects missing or invalid settings without carrying raw input",
    (input) =>
      Effect.gen(function* () {
        const checked = yield* TaxKitWebServerConfig(input.TAXKIT_API).pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromUnknown(input)
          ),
          Effect.result
        );
        expect(Result.isFailure(checked)).toBe(true);
        if (Result.isFailure(checked)) {
          expect(checked.failure.message).toBe(
            "TaxKit web settings are missing or invalid."
          );
          const encoded = yield* Schema.encodeEffect(
            Schema.fromJsonString(WebsiteSettingsTransport)
          )(checked);
          expect(encoded).not.toContain("secret-canary");
        }
      })
  );
});
