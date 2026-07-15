import { TaxKitHttpApiViteEnvConfig } from "@taxkit/api-http/config";
import { Config, ConfigProvider } from "effect";

export const TaxKitWebClientConfig = Config.all({
  ...TaxKitHttpApiViteEnvConfig,
});

export const TaxKitWebClientConfigProviderLive = ConfigProvider.layer(
  ConfigProvider.fromEnv({ env: import.meta.env }).pipe(
    ConfigProvider.constantCase
  )
);
