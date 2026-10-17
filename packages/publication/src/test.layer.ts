import type { DocsPublicCatalogue } from "@taxkit/content/schemas";
import { ContentCatalogue } from "@taxkit/content/service";
import { Array, Effect, Layer, Ref } from "effect";

import type { PublicationObservations } from "./__testing__/observations.js";
import { ContentDiscoveryLive } from "./live.layer.js";
import type { DocsDiscoveryPath, DocsDiscoverySettings } from "./schemas.js";
import { ContentDiscovery, ContentDiscoverySettings } from "./service.js";

export const makeContentDiscoveryTest = Effect.fnUntraced(function* (
  catalogue: DocsPublicCatalogue,
  settings: DocsDiscoverySettings
) {
  const service = yield* ContentDiscovery.pipe(
    Effect.provide(
      ContentDiscoveryLive.pipe(
        Layer.provide(
          Layer.succeed(ContentDiscoverySettings)(Effect.succeed(settings))
        ),
        Layer.provide(Layer.succeed(ContentCatalogue, catalogue))
      )
    )
  );
  const requestedDocuments = yield* Ref.make<readonly DocsDiscoveryPath[]>([]);
  return {
    layer: Layer.succeed(
      ContentDiscovery,
      ContentDiscovery.of({
        getDocument: Effect.fn("ContentDiscovery.getDocument")(
          function* (path) {
            yield* Ref.update(requestedDocuments, Array.append(path));
            return yield* service.getDocument(path);
          }
        ),
      })
    ),
    observations: { requestedDocuments } satisfies PublicationObservations,
  };
});
