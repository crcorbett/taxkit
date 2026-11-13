import type {
  DocsPublicationOrigin,
  PublicHttpOrigin,
} from "@taxkit/content/schemas";
import { Context, Schema } from "effect";
import type { Effect } from "effect";

// The stage's publication settings are missing or invalid. Discovery documents
// answer 503; the catalogue and its pages are unaffected.
export class PublicationSettingsUnavailable extends Schema.TaggedError<
  PublicationSettingsUnavailable,
  { readonly brand: unique symbol }
>()("PublicationSettingsUnavailable", {}) {}

// This stage's two origins, read lazily by the host: native planning binds the
// addresses, so the API reads them on first use, never at source build.
export class PublicationOrigins extends Context.Service<
  PublicationOrigins,
  Effect.Effect<
    Readonly<{
      apiOrigin: typeof PublicHttpOrigin.Type;
      publicationOrigin: DocsPublicationOrigin;
    }>,
    PublicationSettingsUnavailable
  >
>()("@taxkit/aeo/PublicationOrigins") {}
