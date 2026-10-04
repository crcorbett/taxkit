import { Config, ConfigProvider, Effect } from "effect";

import { ApiWorkerSettings } from "./schemas.js";

export const ApiWorkerSettingsConfig = Config.all({
  apiOrigin: Config.schema(
    ApiWorkerSettings.fields.apiOrigin,
    "API_PUBLIC_ORIGIN"
  ),
  websiteOrigin: Config.schema(
    ApiWorkerSettings.fields.websiteOrigin,
    "WEBSITE_PUBLIC_ORIGIN"
  ),
}).pipe(
  Effect.map(ApiWorkerSettings.make),
  Effect.mapError(
    () =>
      new Config.ConfigError(
        new ConfigProvider.SourceError({
          message: "API Worker origins are missing or invalid",
        })
      )
  )
);
