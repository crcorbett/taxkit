import { WhatTaxHttpApiViteEnvConfig } from "@whattax/http-api/config";
import { Config, ConfigProvider } from "effect";

export const WhatTaxWebClientConfig = Config.all({
  ...WhatTaxHttpApiViteEnvConfig,
});

export const WhatTaxWebClientConfigProviderLive = ConfigProvider.layer(
  ConfigProvider.fromEnv({ env: import.meta.env }).pipe(
    ConfigProvider.constantCase
  )
);
