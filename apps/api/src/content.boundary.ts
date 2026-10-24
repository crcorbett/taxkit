import { DocsSourceError } from "@taxkit/content/errors";
import { ContentServiceLive } from "@taxkit/content/live";
import { DocsPublicCatalogue } from "@taxkit/content/schemas";
import { ContentCatalogue } from "@taxkit/content/service";
import { Effect, Layer, Schema } from "effect";

import catalogue from "./generated/docs-catalogue.json" with { type: "json" };

// The API build writes the checked catalogue from the authored MDX. The
// Worker decodes it once per isolate; it never parses MDX at request time.
export const ApiContentLive = ContentServiceLive.pipe(
  Layer.provideMerge(
    Layer.effect(
      ContentCatalogue,
      Schema.decodeUnknownEffect(DocsPublicCatalogue)(catalogue).pipe(
        Effect.mapError(
          () =>
            new DocsSourceError({
              message: "The built docs catalogue is invalid.",
              operation: "decode",
            })
        )
      )
    )
  )
);
