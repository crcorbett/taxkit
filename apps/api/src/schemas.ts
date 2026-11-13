import { TaxKitApiOrigin } from "@taxkit/api-http/origin";
import {
  DocsPublicationOrigin,
  DocsWebsiteOrigin,
} from "@taxkit/content/schemas";
import { Schema } from "effect";

const ApiServerHostSchema = Schema.NonEmptyString;

const ApiServerPortSchema = Schema.Int.check(
  Schema.isBetween({
    maximum: 65_535,
    minimum: 1,
  })
);

export const ApiServerConfigSourceSchema = Schema.Struct({
  host: ApiServerHostSchema,
  port: ApiServerPortSchema,
});

export const ApiServerTcpAddressSchema = Schema.TaggedStruct("TcpAddress", {
  hostname: ApiServerHostSchema,
  port: ApiServerPortSchema,
});

export const ApiServerConfigSchema = Schema.Struct({
  address: ApiServerTcpAddressSchema,
});

export type ApiServerConfigService = Schema.Schema.Type<
  typeof ApiServerConfigSchema
>;

export class ApiServerConfigError extends Schema.TaggedError<
  ApiServerConfigError,
  { readonly brand: unique symbol }
>()("ApiServerConfigError", { operation: Schema.Literal("settings") }) {}

// The Worker reads its deferred origin bindings on first use. Missing or
// invalid values fail every request with this one named error; the request
// boundary answers it with 503 Service Unavailable.
export class ApiWorkerSettingsUnavailable extends Schema.TaggedError<
  ApiWorkerSettingsUnavailable,
  { readonly brand: unique symbol }
>()("ApiWorkerSettingsUnavailable", {
  operation: Schema.Literals(["settings", "mcp"]),
}) {}

// One named startup failure for the whole API Worker. Each composed package's
// construction failure maps to a closed reason here; the native host maps
// this one tag.
export class ApiWorkerStartupError extends Schema.TaggedError<
  ApiWorkerStartupError,
  { readonly brand: unique symbol }
>()("ApiWorkerStartupError", {
  reason: Schema.Literals([
    "analytics-settings",
    "docs-catalogue",
    "host-settings",
  ]),
}) {}

export const ApiWorkerSettings = Schema.Struct({
  apiOrigin: TaxKitApiOrigin,
  publicationOrigin: DocsPublicationOrigin,
  websiteOrigin: DocsWebsiteOrigin,
});

export type ApiWorkerSettings = typeof ApiWorkerSettings.Type;
