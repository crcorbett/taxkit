import "@tanstack/react-start/server-only";
import { WhatTaxHttpApiServerEnvConfig } from "@whattax/api-http/config";
import { Config, ConfigProvider } from "effect";

export const WhatTaxWebServerConfig = Config.all({
  ...WhatTaxHttpApiServerEnvConfig,
});

export const WhatTaxWebServerConfigProviderLive = ConfigProvider.layer(
  ConfigProvider.fromEnv().pipe(ConfigProvider.constantCase)
);
