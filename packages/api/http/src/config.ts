import { Config, Schema } from "effect";

export const TaxKitHttpApiClientConfigSchema = Schema.Struct({
  baseUrl: Schema.URLFromString,
});

export type TaxKitHttpApiClientConfig = Schema.Schema.Type<
  typeof TaxKitHttpApiClientConfigSchema
>;

export interface TaxKitHttpApiConfig {
  readonly httpApi: TaxKitHttpApiClientConfig;
}

const HttpApiClientConfig = Config.all({
  baseUrl: Config.url("BASE_URL"),
}).pipe(Config.map(TaxKitHttpApiClientConfigSchema.make));

export const TaxKitHttpApiConfig = {
  httpApi: HttpApiClientConfig,
} satisfies Config.Wrap<TaxKitHttpApiConfig>;

export const TaxKitHttpApiServerEnvConfig = {
  httpApi: HttpApiClientConfig.pipe(Config.nested("TAXKIT_API")),
} satisfies Config.Wrap<TaxKitHttpApiConfig>;

export const TaxKitHttpApiViteEnvConfig = {
  httpApi: HttpApiClientConfig.pipe(Config.nested("VITE_TAXKIT_API")),
} satisfies Config.Wrap<TaxKitHttpApiConfig>;
