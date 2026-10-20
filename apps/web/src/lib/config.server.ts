import "@tanstack/react-start/server-only";
import { TaxKitApiOriginConfig } from "@taxkit/api-http/origin";
import {
  DocsPublicationOriginConfig,
  DocsWebsiteOriginConfig,
} from "@taxkit/content/config";
import type { TaxKitApiBinding } from "@taxkit/infrastructure/api-worker";
import {
  CalculatorHostMode,
  WebsiteForwardingCredential,
} from "@taxkit/observability/edge-identity";
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
      Predicate.isFunction(value.connect)
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
  "TAXKIT_WEBSITE_FORWARDING_KEY",
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
    apiOrigin: TaxKitApiOriginConfig,
    publicationOrigin: DocsPublicationOriginConfig,
    websiteOrigin: DocsWebsiteOriginConfig,
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
    apiOrigin: TaxKitApiOriginConfig,
    binding: Schema.decodeUnknownEffect(PrivateApiBinding)(
      Record.get(bindings, "TAXKIT_API").pipe(Option.getOrUndefined)
    ),
    // Defer the generated Output-backed key until a calculation executes.
    // Missing private credentials cannot make public metadata reads unavailable.
    forwardingCredential: Effect.succeed(
      Config.schema(
        WebsiteForwardingCredential,
        "TAXKIT_WEBSITE_FORWARDING_KEY"
      ).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, provider),
        Effect.mapError(() => new WebsiteApiConfigError())
      )
    ),
    hostMode: Config.schema(CalculatorHostMode, "CALCULATOR_HOST_MODE").pipe(
      Config.withDefault("edge")
    ),
  }).pipe(Effect.provideService(ConfigProvider.ConfigProvider, provider));
}).pipe(Effect.mapError(() => new WebsiteApiConfigError()));
