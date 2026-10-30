import { TaxKitApiOriginConfig } from "@taxkit/api-http/origin";
import "@tanstack/react-start/server-only";
import {
  DocsPublicationOriginConfig,
  DocsWebsiteOriginConfig,
} from "@taxkit/content/config";
import type { TaxKitApiBinding } from "@taxkit/infrastructure/api-worker";
import { reifyBoundConfigProvider } from "alchemy/Runtime";
import {
  Function as EffectFunction,
  Array,
  ConfigProvider,
  Context,
  Effect,
  Option,
  Predicate,
  Record,
  Schema,
} from "effect";

import { TaxKitWebConfigError, WebsiteApiConfigError } from "./errors";
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
  "TAXKIT_PUBLICATION_ORIGIN",
  "WEBSITE_PUBLIC_ORIGIN",
] as const;
const websiteConfigProvider = WebsiteBindings.pipe(
  Effect.map((bindings) => {
    const selected = EffectFunction.pipe(
      bindings,
      Record.filter((_, key) => Array.contains(websiteKeys, key))
    );
    return EffectFunction.pipe(
      ConfigProvider.fromUnknown(selected),
      (argument1) =>
        EffectFunction.pipe(selected, (argument2) =>
          reifyBoundConfigProvider(argument1, argument2)
        )
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
  }).pipe(Effect.provideService(ConfigProvider.ConfigProvider, provider));
}).pipe(Effect.mapError(() => new WebsiteApiConfigError()));
