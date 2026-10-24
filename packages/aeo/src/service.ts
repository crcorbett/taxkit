import type { DocsSourceError } from "@taxkit/content/errors";
import type {
  DocsPublicationOrigin,
  PublicHttpOrigin,
} from "@taxkit/content/schemas";
import { Context } from "effect";
import type { Effect } from "effect";

// This stage's two origins, read lazily by the host: native planning binds the
// addresses, so the API reads them on first use, never at source build.
export class PublicationOrigins extends Context.Service<
  PublicationOrigins,
  Effect.Effect<
    Readonly<{
      apiOrigin: typeof PublicHttpOrigin.Type;
      publicationOrigin: DocsPublicationOrigin;
    }>,
    DocsSourceError
  >
>()("@taxkit/aeo/PublicationOrigins") {}
