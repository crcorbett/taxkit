import "@tanstack/react-start/server-only";
import type { TaxKitApiBinding } from "@taxkit/infrastructure/api-worker";
import { CalculatorHostMode } from "@taxkit/observability/edge-identity";
import { reifyBoundConfigProvider } from "alchemy/Runtime";
import {
  Array,
  Config,
  ConfigProvider,
  Context,
  Effect,
  Option,
  Predicate,
  Record,
  Schema,
} from "effect";

import { WebsiteApiConfigError } from "./api/errors";
import { TaxKitWebConfigError } from "./config";
import { WebsitePublicSettings } from "./schemas";

/** The raw Cloudflare bindings object, supplied once by the server host. */
export class WebsiteBindings extends Context.Service<
  WebsiteBindings,
  Readonly<Record<string, unknown>>
>()("taxkit/web/WebsiteBindings") {}

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

// Only Website-owned settings reach Config. Alchemy's reader unwraps its
// protected binding format; nothing here inspects those markers itself.
const websiteKeys = [
  "API_PUBLIC_ORIGIN",
  "CALCULATOR_HOST_MODE",
  "POSTHOG_CAPTURE_TOKEN",
  "POSTHOG_COLLECTION_MODE",
  "POSTHOG_PROJECT_ID",
  "POSTHOG_REGION",
  "POSTHOG_STAGE",
  "TAXKIT_PUBLICATION_ORIGIN",
  "WEBSITE_PUBLIC_ORIGIN",
] as const;

export const websiteConfigProvider = WebsiteBindings.pipe(
  Effect.map((bindings) => {
    const selected = Record.filter(bindings, (_, key) =>
      Array.contains(websiteKeys, key)
    );
    return reifyBoundConfigProvider(
      ConfigProvider.fromUnknown(selected),
      selected
    );
  })
);

export const WebsiteSettingsConfig = Effect.gen(function* () {
  const provider = yield* websiteConfigProvider;
  return yield* Effect.all({
    apiOrigin: Config.schema(
      WebsitePublicSettings.fields.apiOrigin,
      "API_PUBLIC_ORIGIN"
    ),
    publicationOrigin: Config.schema(
      WebsitePublicSettings.fields.publicationOrigin,
      "TAXKIT_PUBLICATION_ORIGIN"
    ),
    websiteOrigin: Config.schema(
      WebsitePublicSettings.fields.websiteOrigin,
      "WEBSITE_PUBLIC_ORIGIN"
    ),
  }).pipe(Effect.provideService(ConfigProvider.ConfigProvider, provider));
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

export const WebsiteApiConfig = Effect.gen(function* () {
  const bindings = yield* WebsiteBindings;
  const provider = yield* websiteConfigProvider;
  return yield* Effect.all({
    apiOrigin: Config.schema(
      WebsitePublicSettings.fields.apiOrigin,
      "API_PUBLIC_ORIGIN"
    ),
    binding: Schema.decodeUnknownEffect(PrivateApiBinding)(
      Record.get(bindings, "TAXKIT_API").pipe(Option.getOrUndefined)
    ),
    hostMode: Config.schema(CalculatorHostMode, "CALCULATOR_HOST_MODE").pipe(
      Config.withDefault("edge")
    ),
  }).pipe(Effect.provideService(ConfigProvider.ConfigProvider, provider));
}).pipe(Effect.mapError(() => new WebsiteApiConfigError()));
