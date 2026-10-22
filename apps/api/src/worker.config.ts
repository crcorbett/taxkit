import { TaxKitApiOriginConfig } from "@taxkit/api-http/origin";
import { DocsPublicationOriginConfig } from "@taxkit/content/config";
import { Config, ConfigProvider, Effect } from "effect";

import { ApiWorkerSettings } from "./schemas.js";

export const ApiWorkerSettingsConfig = Config.all({
  apiOrigin: TaxKitApiOriginConfig,
  publicationOrigin: DocsPublicationOriginConfig,
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
