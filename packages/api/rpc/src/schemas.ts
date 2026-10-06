import {
  CalculatorRunServiceRequest,
  DescriptorFilterQuery,
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { PublicHttpOrigin } from "@taxkit/content/schemas";
import { ByteSize, Duration, Schema, SchemaGetter } from "effect";

export {
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorGraphResponse,
  CalculatorRunResponse,
  CalculatorRunServiceRequest,
  CalculatorSchemaResponse,
  DescriptorFilterQuery,
  FactsResponse,
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  JurisdictionsResponse,
  MetadataQuery,
  RulesResponse,
  TaxYearsResponse,
} from "@taxkit/calculators/schemas";
export { DocsNavigation, DocsPagePath } from "@taxkit/content/schemas";

export const CalculatorRpcVersion = "4";
export const CalculatorRpcPayload = Schema.Struct({
  request: CalculatorRunServiceRequest,
  version: Schema.String.check(Schema.isMaxLength(32)),
});
export const CalculatorCatalogRpcPayload = Schema.Struct({
  query: MetadataQuery,
  version: CalculatorRpcPayload.fields.version,
});

export const CalculatorMetadataRpcPayload = Schema.Struct({
  request: GetCalculatorRequest,
  version: CalculatorRpcPayload.fields.version,
});
export const CalculatorGraphRpcPayload = Schema.Struct({
  request: GetCalculatorGraphRequest,
  version: CalculatorRpcPayload.fields.version,
});
export const CalculatorDescriptorRpcPayload = Schema.Struct({
  query: DescriptorFilterQuery,
  version: CalculatorRpcPayload.fields.version,
});
export const CalculatorDiscoveryRpcPayload = Schema.Struct({
  version: CalculatorRpcPayload.fields.version,
});

export const CalculatorRpcOrigin = PublicHttpOrigin.pipe(
  Schema.brand("@taxkit/api-rpc/CalculatorRpcOrigin")
);
export type CalculatorRpcOrigin = typeof CalculatorRpcOrigin.Type;

export const CalculatorRpcDeadline = Duration.seconds(10);
export const CalculatorRpcResponseLimit = ByteSize.mebibytes(2);
export const CalculatorRpcSafeDefect = Schema.Unknown.pipe(
  Schema.encodeTo(Schema.Literal("Calculation service failed"), {
    decode: SchemaGetter.transform((value: string) => value),
    encode: SchemaGetter.transform(() => "Calculation service failed" as const),
  })
);
