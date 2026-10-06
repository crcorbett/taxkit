import "@tanstack/react-start/server-only";
import { CalculatorHostMode } from "@taxkit/api-rpc/rate-identity";
import type { TaxKitApiBinding } from "api/worker";
import { Config, Effect, Predicate, Schema } from "effect";

import { TaxKitWebConfigError } from "./config";
import { WebsiteHostOrigins } from "./schemas";

// This is the native SDK capability boundary. Preserve the original Fetcher
// object (and method receiver); a Struct would copy its methods off the binding.
const PrivateApiBinding: Schema.Codec<TaxKitApiBinding> =
  Schema.declare<TaxKitApiBinding>(
    (value): value is TaxKitApiBinding =>
      Predicate.isObject(value) &&
      Predicate.hasProperty(value, "fetch") &&
      Predicate.isFunction(value.fetch) &&
      Predicate.hasProperty(value, "connect") &&
      Predicate.isFunction(value.connect) &&
      Predicate.hasProperty(value, "calculatorRequest") &&
      Predicate.isFunction(value.calculatorRequest)
  );
export const TaxKitWebServerConfig = (
  rawBinding: unknown
): Effect.Effect<
  typeof WebsiteHostOrigins.Type & {
    readonly binding: typeof PrivateApiBinding.Type;
    readonly hostMode: CalculatorHostMode;
  },
  TaxKitWebConfigError
> =>
  Effect.all({
    apiOrigin: Config.schema(
      WebsiteHostOrigins.fields.apiOrigin,
      "API_PUBLIC_ORIGIN"
    ),
    binding: Schema.decodeUnknownEffect(PrivateApiBinding)(rawBinding),
    hostMode: Config.schema(CalculatorHostMode, "CALCULATOR_HOST_MODE").pipe(
      Config.withDefault("edge")
    ),
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
