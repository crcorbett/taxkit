import { Context, Effect, Layer } from "effect";

export interface ApiServerConfigService {
  readonly host: string;
  readonly port: number;
}

export class ApiServerConfig extends Context.Service<
  ApiServerConfig,
  ApiServerConfigService
>()("@whattax/api/ServerConfig") {}

export interface ApiConfigError {
  readonly _tag: "ApiConfigError";
  readonly message: string;
}

const defaultHost = "127.0.0.1";
const defaultPort = 4000;

const makeApiConfigError = (message: string): ApiConfigError => ({
  _tag: "ApiConfigError",
  message,
});

const isApiConfigError = (error: unknown): error is ApiConfigError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  error._tag === "ApiConfigError";

const parsePort = (raw: string | undefined): number => {
  if (raw === undefined || raw.trim() === "") {
    return defaultPort;
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw makeApiConfigError(
      `API_PORT must be an integer between 1 and 65535, received ${raw}`
    );
  }

  return port;
};

const makeApiServerConfig = (
  env: NodeJS.ProcessEnv = process.env
): ApiServerConfigService => ({
  host: env.API_HOST?.trim() || defaultHost,
  port: parsePort(env.API_PORT),
});

export const ApiServerConfigLive = Layer.effect(
  ApiServerConfig,
  Effect.try({
    catch: (error) =>
      isApiConfigError(error) ? error : makeApiConfigError(String(error)),
    try: () => makeApiServerConfig(),
  })
);
