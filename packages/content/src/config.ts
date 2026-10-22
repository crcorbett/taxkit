import { Config } from "effect";

import { DocsPublicationOrigin, DocsWebsiteOrigin } from "./schemas.js";

// Host binding names for the checked origins. This internal subpath is not in
// the published export map: TaxKit's own hosts read these bindings, library
// consumers receive only the Schemas.
export const DocsPublicationOriginConfig = Config.schema(
  DocsPublicationOrigin,
  "TAXKIT_PUBLICATION_ORIGIN"
);
export const DocsWebsiteOriginConfig = Config.schema(
  DocsWebsiteOrigin,
  "WEBSITE_PUBLIC_ORIGIN"
);
