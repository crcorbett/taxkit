import "@tanstack/react-start/server-only";
import type { fromCloudflareFetcher } from "alchemy/Cloudflare";
import { Config, Effect, Predicate, Schema } from "effect";

import { TaxKitWebConfigError } from "./config";
import { WebsiteHostOrigins } from "./schemas";

// This is the native SDK capability boundary. Preserve the original Fetcher
// object (and method receiver); a Struct would copy its methods off the binding.
const PrivateApiBinding: Schema.Codec<
  Parameters<typeof fromCloudflareFetcher>[0]
> = Schema.declare<Parameters<typeof fromCloudflareFetcher>[0]>(
  (value): value is Parameters<typeof fromCloudflareFetcher>[0] =>
    Predicate.isObject(value) &&
    Predicate.hasProperty(value, "fetch") &&
    Predicate.isFunction(value.fetch) &&
    Predicate.hasProperty(value, "connect") &&
    Predicate.isFunction(value.connect)
);
export const TaxKitWebServerConfig = (
  rawBinding: unknown
): Effect.Effect<
  typeof WebsiteHostOrigins.Type & {
    readonly binding: typeof PrivateApiBinding.Type;
  },
  TaxKitWebConfigError
> =>
  Effect.all({
    apiOrigin: Config.schema(
      WebsiteHostOrigins.fields.apiOrigin,
      "API_PUBLIC_ORIGIN"
    ),
    binding: Schema.decodeUnknownEffect(PrivateApiBinding)(rawBinding),
    websiteOrigin: Config.schema(
      WebsiteHostOrigins.fields.websiteOrigin,
      "WEBSITE_PUBLIC_ORIGIN"
    ),
  }).pipe(
    Effect.mapError(
      () =>
        new TaxKitWebConfigError({
          message: "TaxKit web settings are missing or invalid.",
          operation: "settings",
          runtime: "server",
        })
    )
  );
