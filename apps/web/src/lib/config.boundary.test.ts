import { describe, expect, it } from "@effect/vitest";
import {
  Array,
  ConfigProvider,
  Effect,
  Option,
  Record,
  Result,
  Schema,
} from "effect";

import webConfig from "../../vite.config.ts";
import { TaxKitWebConfigError } from "./config";
import {
  TaxKitWebClientConfig,
  TaxKitWebClientConfigProviderLive,
} from "./config.client";
import {
  TaxKitWebClientInput,
  TaxKitWebClientInputConfig,
} from "./config.client-input";
import { TaxKitWebServerConfig } from "./config.server";

const runtimes = [
  {
    config: TaxKitWebClientConfig,
    key: "VITE_TAXKIT_API_BASE_URL",
    runtime: "client",
  },
  {
    config: TaxKitWebServerConfig,
    key: "TAXKIT_API_BASE_URL",
    runtime: "server",
  },
] as const;

describe("web settings boundary", () => {
  it.effect.each(["build", "serve"] as const)(
    "exposes only the typed API build input for %s",
    (command) =>
      Effect.gen(function* () {
        const config = webConfig({ command, mode: "production" });
        expect(config.envPrefix).toEqual([]);
        expect(Record.keys(config.define ?? {})).toEqual([
          "__TAXKIT_WEB_CLIENT_INPUT__",
        ]);
        const encoded = yield* Effect.fromOption(
          Record.get(config.define ?? {}, "__TAXKIT_WEB_CLIENT_INPUT__")
        );
        const decoded = yield* Schema.decodeUnknownEffect(
          Schema.fromJsonString(TaxKitWebClientInput)
        )(encoded);
        expect(Schema.is(TaxKitWebClientInput)(decoded)).toBe(true);
      })
  );

  it.effect.each(
    Array.flatMap(runtimes, (runtime) =>
      Array.map(
        ["http://localhost:4000", "https://api.taxkit.example"],
        (baseUrl) => ({
          ...runtime,
          baseUrl,
        })
      )
    )
  )(
    "loads $runtime URL $baseUrl with the HTTP owner's Config",
    ({ baseUrl, config, key }) =>
      Effect.gen(function* () {
        const settings = yield* config.pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromEnv({ env: { [key]: baseUrl } }).pipe(
              ConfigProvider.constantCase
            )
          )
        );
        expect(settings.httpApi.baseUrl.href).toBe(`${baseUrl}/`);
      })
  );

  it.effect.each(
    Array.flatMap(runtimes, (runtime) =>
      Array.map([undefined, "", "TAXKIT_SECRET_SENTINEL"], (value) => ({
        ...runtime,
        value,
      }))
    )
  )(
    "rejects $runtime settings $value with a safe error",
    ({ config, key, runtime, value }) =>
      Effect.gen(function* () {
        const result = yield* config.pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromEnv({
              env: Option.fromUndefinedOr(value).pipe(
                Option.match({
                  onNone: () => ({}),
                  onSome: (present) => ({ [key]: present }),
                })
              ),
            }).pipe(ConfigProvider.constantCase)
          ),
          Effect.result
        );
        expect(Result.isFailure(result)).toBe(true);
        if (Result.isFailure(result)) {
          const encoded = yield* Schema.encodeEffect(
            Schema.fromJsonString(TaxKitWebConfigError)
          )(result.failure);
          expect(encoded).toBe(
            `{"_tag":"TaxKitWebConfigError","message":"TaxKit web settings are missing or invalid.","operation":"settings","runtime":"${runtime}"}`
          );
          expect(String(result.failure)).not.toContain(
            "TAXKIT_SECRET_SENTINEL"
          );
          expect(encoded).not.toContain("cause");
        }
      })
  );

  it.effect.each([
    { env: {}, expected: "{}" },
    {
      env: { VITE_TAXKIT_API_BASE_URL: "TAXKIT_SECRET_SENTINEL" },
      expected: '{"VITE_TAXKIT_API_BASE_URL":"TAXKIT_SECRET_SENTINEL"}',
    },
    {
      env: {
        TAXKIT_API_BASE_URL: "SERVER_ONLY_SENTINEL",
        VITE_TAXKIT_API_BASE_URL: "https://api.taxkit.example",
      },
      expected: '{"VITE_TAXKIT_API_BASE_URL":"https://api.taxkit.example"}',
    },
  ])(
    "selects only the existing public build input $expected",
    ({ env, expected }) =>
      Effect.gen(function* () {
        const input = yield* TaxKitWebClientInputConfig.pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromEnv({ env })
          )
        );
        expect(
          yield* Schema.encodeEffect(
            Schema.fromJsonString(TaxKitWebClientInput)
          )(input)
        ).toBe(expected);
      })
  );

  it.effect(
    "keeps an absent compiled browser URL a runtime configuration failure",
    () =>
      Effect.gen(function* () {
        const result = yield* TaxKitWebClientConfig.pipe(
          Effect.provide(TaxKitWebClientConfigProviderLive),
          Effect.result
        );
        expect(Result.isFailure(result)).toBe(true);
      })
  );
});
