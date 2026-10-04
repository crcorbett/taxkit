import { TaxKitHttpApiViteEnvConfig } from "@taxkit/api-http/config";
import { Config, ConfigProvider, Effect } from "effect";

import { TaxKitWebConfigError } from "./config";

export const TaxKitWebClientConfig = Config.all({
  ...TaxKitHttpApiViteEnvConfig,
}).pipe(
  Effect.mapError(
    () =>
      new TaxKitWebConfigError({
        message: "TaxKit web settings are missing or invalid.",
        operation: "settings",
        runtime: "client",
      })
  )
);

export const TaxKitWebClientConfigProviderLive = ConfigProvider.layer(
  ConfigProvider.fromEnv({ env: __TAXKIT_WEB_CLIENT_INPUT__ }).pipe(
    ConfigProvider.constantCase
  )
);
