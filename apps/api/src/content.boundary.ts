import { ContentServiceLive } from "@taxkit/content/live";
import { DocsPublicCatalogue } from "@taxkit/content/schemas";
import { ContentCatalogue } from "@taxkit/content/service";
import catalogue from "@taxkit/docs-content/public-catalogue" with { type: "json" };
import { Config, ConfigProvider, Effect, Layer, Schema } from "effect";

// This application boundary receives a generated JSON value. Compiler and filesystem
// Layers remain with the build command, outside incoming request handling.
export const ApiContentLive = ContentServiceLive.pipe(
  Layer.provide(
    Layer.effect(
      ContentCatalogue,
      Schema.decodeUnknownEffect(DocsPublicCatalogue)(catalogue).pipe(
        Effect.mapError(
          () =>
            new Config.ConfigError(
              new ConfigProvider.SourceError({
                message:
                  "The public documentation catalogue could not be loaded.",
              })
            )
        )
      )
    )
  )
);
