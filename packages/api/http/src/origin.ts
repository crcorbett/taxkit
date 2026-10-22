import { PublicHttpOrigin } from "@taxkit/content/schemas";
import { Config, Schema } from "effect";

// The API's public address: the native Worker's own URL, which the Website's
// browser client and links use too. This internal subpath is not in the
// published export map; only TaxKit's own hosts read the binding.
export const TaxKitApiOrigin = PublicHttpOrigin.pipe(
  Schema.brand("@taxkit/api-http/TaxKitApiOrigin")
);
export type TaxKitApiOrigin = typeof TaxKitApiOrigin.Type;
export const TaxKitApiOriginConfig = Config.schema(
  TaxKitApiOrigin,
  "API_PUBLIC_ORIGIN"
);
