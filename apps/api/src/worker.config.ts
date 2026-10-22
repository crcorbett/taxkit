import { TaxKitApiOriginConfig } from "@taxkit/api-http/origin";
import {
  DocsPublicationOriginConfig,
  DocsWebsiteOriginConfig,
} from "@taxkit/content/config";
import { Config, ConfigProvider, Effect } from "effect";

import { ApiWorkerSettings } from "./schemas.js";

export const ApiWorkerSettingsConfig = Config.all({
  apiOrigin: TaxKitApiOriginConfig,
  publicationOrigin: DocsPublicationOriginConfig,
  websiteOrigin: DocsWebsiteOriginConfig,
}).pipe(
  Effect.map((value) => ApiWorkerSettings.make(value)),
  Effect.mapError(
    () =>
      new Config.ConfigError(
        new ConfigProvider.SourceError({
          message: "API Worker origins are missing or invalid",
        })
      )
  )
);
