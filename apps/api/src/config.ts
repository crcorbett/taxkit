import { Config, ConfigProvider, Context, Effect, Layer, Schema } from "effect";

const defaultHost = "127.0.0.1";
const defaultPort = 4000;

const ApiServerConfigSchema = Schema.Struct({
  host: Schema.NonEmptyString,
  port: Schema.Int.check(
    Schema.isBetween({
      maximum: 65_535,
      minimum: 1,
    })
  ),
});

export type ApiServerConfigService = Schema.Schema.Type<
  typeof ApiServerConfigSchema
>;

export class ApiServerConfig extends Context.Service<
  ApiServerConfig,
  ApiServerConfigService
>()("@whattax/api/ServerConfig") {}

const ApiServerConfigSource = Config.all({
  host: Config.string("API_HOST").pipe(Config.withDefault(defaultHost)),
  port: Config.port("API_PORT").pipe(Config.withDefault(defaultPort)),
});

const loadApiServerConfig = ApiServerConfigSource.parse(
  ConfigProvider.fromEnv()
).pipe(
  Effect.flatMap((source) =>
    Schema.decodeUnknownEffect(ApiServerConfigSchema)({
      host: source.host.trim() || defaultHost,
      port: source.port,
    })
  )
);

export const ApiServerConfigLive = Layer.effect(
  ApiServerConfig,
  loadApiServerConfig
);
