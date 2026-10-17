import type { Ref } from "effect";

import type { DocsDiscoveryPath } from "../schemas.js";

export interface PublicationObservations {
  readonly requestedDocuments: Ref.Ref<readonly DocsDiscoveryPath[]>;
}
