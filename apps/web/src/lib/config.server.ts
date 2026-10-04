import "@tanstack/react-start/server-only";
import { TaxKitHttpApiServerEnvConfig } from "@taxkit/api-http/config";
import { Config, ConfigProvider, Effect } from "effect";

import { TaxKitWebConfigError } from "./config";

export const TaxKitWebServerConfig = Config.all({
  ...TaxKitHttpApiServerEnvConfig,
}).pipe(
  Effect.mapError(
    () =>
      new TaxKitWebConfigError({
        message: "TaxKit web settings are missing or invalid.",
        operation: "settings",
        runtime: "server",
      })
  )
);

export const TaxKitWebServerConfigProviderLive = ConfigProvider.layer(
  ConfigProvider.fromEnv().pipe(ConfigProvider.constantCase)
);
