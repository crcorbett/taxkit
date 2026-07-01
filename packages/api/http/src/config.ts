import { Config, Schema } from "effect";

export const WhatTaxHttpApiClientConfigSchema = Schema.Struct({
  baseUrl: Schema.URLFromString,
});

export type WhatTaxHttpApiClientConfig = Schema.Schema.Type<
  typeof WhatTaxHttpApiClientConfigSchema
>;

export interface WhatTaxHttpApiConfig {
  readonly httpApi: WhatTaxHttpApiClientConfig;
}

const HttpApiClientConfig = Config.schema(WhatTaxHttpApiClientConfigSchema);

export const WhatTaxHttpApiConfig = {
  httpApi: HttpApiClientConfig,
} satisfies Config.Wrap<WhatTaxHttpApiConfig>;

export const WhatTaxHttpApiServerEnvConfig = {
  httpApi: HttpApiClientConfig.pipe(Config.nested("WHATTAX_API")),
} satisfies Config.Wrap<WhatTaxHttpApiConfig>;

export const WhatTaxHttpApiViteEnvConfig = {
  httpApi: HttpApiClientConfig.pipe(Config.nested("VITE_WHATTAX_API")),
} satisfies Config.Wrap<WhatTaxHttpApiConfig>;
