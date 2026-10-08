import {
  Config,
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
} from "effect";

import {
  ApiServerConfigError,
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
>()("@taxkit/api/ServerConfig") {}

const HostEnvironmentValue = Schema.String.pipe(
  Schema.decodeTo(
    ApiServerConfigSourceSchema.fields.host,
    SchemaTransformation.transform({
      decode: (host) => host.trim() || defaultHost,
      encode: (host) => host,
    })
  )
);

// Config resolves the caller's provider. The live application uses the native
// environment provider; tests substitute it without changing ambient settings.
const loadApiServerConfig = Config.all({
  host: Config.schema(HostEnvironmentValue, "API_HOST").pipe(
    Config.withDefault(defaultHost)
  ),
  port: Config.schema(ApiServerConfigSourceSchema.fields.port, "API_PORT").pipe(
    Config.option,
    Config.flatMap(
      Option.match({
        onNone: () =>
          Config.schema(ApiServerConfigSourceSchema.fields.port, "PORT").pipe(
            Config.withDefault(defaultPort)
          ),
        onSome: Config.succeed,
      })
    )
  ),
}).pipe(
  Effect.mapError(() => new ApiServerConfigError({ operation: "settings" })),
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
