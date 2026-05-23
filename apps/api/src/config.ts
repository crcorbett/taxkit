import { Config, ConfigProvider, Context, Effect, Layer, Schema } from "effect";

import {
  ApiServerConfigSchema,
  ApiServerConfigSourceSchema,
  ApiServerTcpAddressSchema,
} from "./schemas.js";
import type { ApiServerConfigService } from "./schemas.js";

const defaultHost = "127.0.0.1";
const defaultPort = 4000;

export class ApiServerConfig extends Context.Service<
  ApiServerConfig,
  ApiServerConfigService
>()("@whattax/api/ServerConfig") {}

const ApiServerConfigSource = Config.all({
  host: Config.string("API_HOST").pipe(Config.withDefault(defaultHost)),
  port: Config.port("API_PORT").pipe(
    Config.orElse(() => Config.port("PORT")),
    Config.withDefault(defaultPort)
  ),
});

const loadApiServerConfig = ApiServerConfigSource.parse(
  ConfigProvider.fromEnv()
).pipe(
  Effect.flatMap((source) =>
    Schema.decodeUnknownEffect(ApiServerConfigSourceSchema)({
      host: source.host.trim() || defaultHost,
      port: source.port,
    })
  ),
  Effect.map((source) =>
    ApiServerConfigSchema.make({
      address: ApiServerTcpAddressSchema.make({
        hostname: source.host,
        port: source.port,
      }),
    })
  )
);

export const ApiServerConfigLive = Layer.effect(
  ApiServerConfig,
  loadApiServerConfig
);
