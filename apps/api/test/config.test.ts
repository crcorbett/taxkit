import { expect, it } from "@effect/vitest";
import { ConfigProvider, Effect, Result, Schema } from "effect";

import { ApiServerConfig, ApiServerConfigLive } from "../src/config.js";
import {
  ApiServerConfigError,
  ApiServerTcpAddressSchema,
} from "../src/schemas.js";

const loadApiServerConfig = ApiServerConfig.pipe(
  Effect.provide(ApiServerConfigLive)
);

it.effect.each([
  { host: "127.0.0.1", port: 4000, settings: {} },
  { host: "localhost", port: 4000, settings: { API_HOST: "  localhost  " } },
  { host: "127.0.0.1", port: 4000, settings: { API_HOST: "   " } },
  { host: "127.0.0.1", port: 4000, settings: { API_HOST: "" } },
  { host: "127.0.0.1", port: 4173, settings: { PORT: "4173" } },
  {
    host: "127.0.0.1",
    port: 8080,
    settings: { API_PORT: "8080", PORT: "4173" },
  },
  { host: "127.0.0.1", port: 1, settings: { API_PORT: "1" } },
  { host: "127.0.0.1", port: 65_535, settings: { API_PORT: "65535" } },
])("loads checked settings %j", ({ settings, host, port }) =>
  Effect.gen(function* () {
    const config = yield* loadApiServerConfig.pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown(settings)
      )
    );
    expect(config.address).toEqual(
      ApiServerTcpAddressSchema.make({ hostname: host, port })
    );
  })
);

it.effect.each(["0", "65536", "-1", "1.5", "TAXKIT_SECRET_SENTINEL"])(
  "rejects invalid primary port %s without using its fallback or exposing it",
  (port) =>
    Effect.gen(function* () {
      const result = yield* loadApiServerConfig.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({ API_PORT: port, PORT: "4173" })
        ),
        Effect.result
      );
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(
          yield* Schema.encodeEffect(
            Schema.fromJsonString(ApiServerConfigError)
          )(result.failure)
        ).toBe('{"_tag":"ApiServerConfigError","operation":"settings"}');
      }
    })
);

it.effect("isolates each caller's settings", () =>
  Effect.gen(function* () {
    const configs = yield* Effect.all(
      [
        loadApiServerConfig.pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromUnknown({ API_PORT: "5001" })
          )
        ),
        loadApiServerConfig.pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromUnknown({ API_PORT: "5002" })
          )
        ),
      ],
      { concurrency: "unbounded" }
    );
    expect(configs).toEqual([
      {
        address: ApiServerTcpAddressSchema.make({
          hostname: "127.0.0.1",
          port: 5001,
        }),
      },
      {
        address: ApiServerTcpAddressSchema.make({
          hostname: "127.0.0.1",
          port: 5002,
        }),
      },
    ]);
  })
);
