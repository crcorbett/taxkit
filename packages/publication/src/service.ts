import type { DocsSourceError } from "@taxkit/content/errors";
import { Context } from "effect";
import type { Effect } from "effect";

import type {
  DocsDiscoveryDocument,
  DocsDiscoveryPath,
  DocsDiscoverySettings,
} from "./schemas.js";

export class ContentDiscovery extends Context.Service<
  ContentDiscovery,
  {
    readonly getDocument: (
      path: DocsDiscoveryPath
    ) => Effect.Effect<DocsDiscoveryDocument, DocsSourceError>;
  }
>()("@taxkit/publication/ContentDiscovery") {}

// Settings are a checked lazy Effect owned by application composition. Native
// stage addresses are resolved on incoming use, never invented at source build.
export class ContentDiscoverySettings extends Context.Service<
  ContentDiscoverySettings,
  Effect.Effect<DocsDiscoverySettings, DocsSourceError>
>()("@taxkit/publication/ContentDiscoverySettings") {}
