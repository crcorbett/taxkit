import { WhatTaxHttpApiViteEnvConfig } from "@whattax/api-http/config";
import { Config, ConfigProvider } from "effect";

export const WhatTaxWebClientConfig = Config.all({
  ...WhatTaxHttpApiViteEnvConfig,
});

export const WhatTaxWebClientConfigProviderLive = ConfigProvider.layer(
  ConfigProvider.fromEnv({ env: import.meta.env }).pipe(
    ConfigProvider.constantCase
  )
);
