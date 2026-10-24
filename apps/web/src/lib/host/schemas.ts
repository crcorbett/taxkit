import { TaxKitApiOrigin } from "@taxkit/api-http/origin";
import {
  DocsPublicationOrigin,
  DocsWebsiteOrigin,
} from "@taxkit/content/schemas";
import { Schema } from "effect";

export const WebsitePublicSettings = Schema.Struct({
  // The same stage's public API address, used by browser clients.
  apiOrigin: TaxKitApiOrigin,
  // Canonical, social, JSON-LD and Markdown links name the published site.
  publicationOrigin: DocsPublicationOrigin,
  // The running Website's own address: tools, analytics and form actions.
  websiteOrigin: DocsWebsiteOrigin,
});
export type WebsitePublicSettings = typeof WebsitePublicSettings.Type;
// The root loader's checked view: plain encoded values for TanStack's native
// serialisation, decoded once by the root route.
export const WebsiteRootView = Schema.Struct({
  settings: WebsitePublicSettings,
});
