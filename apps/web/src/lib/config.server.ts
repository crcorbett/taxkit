import "@tanstack/react-start/server-only";
import { TaxKitHttpApiServerEnvConfig } from "@taxkit/api-http/config";
import { Config, ConfigProvider } from "effect";

export const TaxKitWebServerConfig = Config.all({
  ...TaxKitHttpApiServerEnvConfig,
});

export const TaxKitWebServerConfigProviderLive = ConfigProvider.layer(
  ConfigProvider.fromEnv().pipe(ConfigProvider.constantCase)
);
