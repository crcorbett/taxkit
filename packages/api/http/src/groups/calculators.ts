import {
  CalculatorCapacityExceeded,
  CalculatorRateLimited,
  CalculatorAdmissionUnavailable,
  CalculatorOperationTimedOut,
  CalculatorRequestError,
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorGraphResponse,
  CalculatorId,
  CalculatorSchemaResponse,
  CalculatorServiceError,
  CalculationQuery,
  DescriptorFilterQuery,
  FactsResponse,
  HelpQuery,
  JurisdictionsResponse,
  MetadataQuery,
  CalculatorRunRequest,
  CalculatorRunResponse,
  RulesResponse,
  TaxYearsResponse,
} from "@taxkit/calculators";
import { Data, Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import {
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
} from "../schemas.js";

export {
  CalculatorCatalog,
  CalculatorCatalogItem,
  CalculatorCatalogItems,
  CalculatorCatalogResponse,
  CalculatorCatalogResponseValue,
  CalculatorContext,
  CalculatorId,
  CalculatorInputDecodeError,
  CalculatorInputHelp,
  CalculatorInputIssue,
  CalculationQuery,
  CalculatorRunReport,
  CalculatorRunRequest,
  CalculatorRunResponse,
  CalculatorServiceError,
  HelpMode,
  UnsupportedCalculatorContextError,
  UnsupportedCalculatorError,
  getCalculatorCatalogEntry,
  listCalculatorCatalogEntries,
  toCalculatorCatalogItem,
  type CalculatorCatalogEntry,
} from "@taxkit/calculators";

const CalculatorApiRequestErrorEnvelope = Schema.Struct({
  error: CalculatorRequestError,
}).pipe(HttpApiSchema.status("BadRequest"));

const CalculatorApiTimeoutEnvelope = Schema.Struct({
  error: CalculatorOperationTimedOut,
}).pipe(HttpApiSchema.status("GatewayTimeout"));
const CalculatorApiMetadataErrorEnvelopes = [
  CalculatorApiRequestErrorEnvelope,
  CalculatorApiTimeoutEnvelope,
] as const;

const CalculatorApiErrorEnvelopes = [
  CalculatorApiRequestErrorEnvelope,
  Schema.Struct({ error: CalculatorRateLimited }).pipe(
    HttpApiSchema.encodeToWithHeaders(
      {
        body: Schema.Struct({ error: CalculatorRateLimited }).pipe(
          HttpApiSchema.status(429)
        ),
        headers: { "retry-after": Schema.Literal("60") },
      },
      {
        decode: ({ body }) => body,
        encode: (body) => ({ body, headers: { "retry-after": "60" as const } }),
      }
    )
  ),
  Schema.Struct({ error: CalculatorAdmissionUnavailable }).pipe(
    HttpApiSchema.status("ServiceUnavailable")
  ),
  Schema.Struct({ error: CalculatorCapacityExceeded }).pipe(
    HttpApiSchema.status("ServiceUnavailable")
  ),
  Schema.Struct({ error: CalculatorOperationTimedOut }).pipe(
    HttpApiSchema.status("GatewayTimeout")
  ),
  Schema.Struct({ error: CalculatorRequestBodyTimedOut }).pipe(
    HttpApiSchema.status(408)
  ),
  Schema.Struct({ error: CalculatorRequestBodyTooLarge }).pipe(
    HttpApiSchema.status(413)
  ),
] as const;

export const CalculatorApiErrorEnvelope = Schema.Struct({
  error: CalculatorServiceError,
});

export type CalculatorApiErrorEnvelope = typeof CalculatorApiErrorEnvelope.Type;

export class CalculatorApiErrorEnvelopeData<
  E extends CalculatorServiceError = CalculatorServiceError,
> extends Data.Class<CalculatorApiErrorEnvelope & { readonly error: E }> {}

const CalculatorParams = Schema.Struct({
  calculatorId: CalculatorId,
});

const GetJurisdictionsEndpoint = HttpApiEndpoint.get(
  "getJurisdictions",
  "/jurisdictions",
  {
    error: CalculatorApiTimeoutEnvelope,
    success: JurisdictionsResponse,
  }
).annotate(OpenApi.Description, "List supported public API jurisdictions.");

const GetTaxYearsEndpoint = HttpApiEndpoint.get("getTaxYears", "/tax-years", {
  error: CalculatorApiTimeoutEnvelope,
  query: MetadataQuery,
  success: TaxYearsResponse,
}).annotate(
  OpenApi.Description,
  "List supported tax years for a jurisdiction."
);

const ListCalculatorsEndpoint = HttpApiEndpoint.get(
  "listCalculators",
  "/calculators",
  {
    error: CalculatorApiTimeoutEnvelope,
    query: MetadataQuery,
    success: CalculatorCatalogResponse,
  }
).annotate(OpenApi.Description, "List public calculator catalog entries.");

const GetCalculatorEndpoint = HttpApiEndpoint.get(
  "getCalculator",
  "/calculators/:calculatorId",
  {
    error: CalculatorApiMetadataErrorEnvelopes,
    params: CalculatorParams,
    query: HelpQuery,
    success: CalculatorCatalogItem,
  }
).annotate(OpenApi.Description, "Return one public calculator catalog entry.");

const GetCalculatorSchemaEndpoint = HttpApiEndpoint.get(
  "getCalculatorSchema",
  "/calculators/:calculatorId/schema",
  {
    error: CalculatorApiMetadataErrorEnvelopes,
    params: CalculatorParams,
    query: HelpQuery,
    success: CalculatorSchemaResponse,
  }
).annotate(
  OpenApi.Description,
  "Return fact, rule and report schema metadata for one calculator."
);

const GetCalculatorGraphEndpoint = HttpApiEndpoint.get(
  "getCalculatorGraph",
  "/calculators/:calculatorId/graph",
  {
    error: CalculatorApiMetadataErrorEnvelopes,
    params: CalculatorParams,
    query: MetadataQuery,
    success: CalculatorGraphResponse,
  }
).annotate(
  OpenApi.Description,
  "Return graph edges and canonical graph validation diagnostics for one calculator."
);

const CalculateEndpoint = HttpApiEndpoint.post(
  "calculate",
  "/calculators/:calculatorId/calculate",
  {
    error: CalculatorApiErrorEnvelopes,
    params: CalculatorParams,
    payload: CalculatorRunRequest,
    query: CalculationQuery,
    success: CalculatorRunResponse,
  }
).annotate(
  OpenApi.Description,
  "Run one public calculator using canonical scenario decoding and rule-pack layers."
);

const ListFactsEndpoint = HttpApiEndpoint.get("listFacts", "/facts", {
  error: CalculatorApiTimeoutEnvelope,
  query: DescriptorFilterQuery,
  success: FactsResponse,
}).annotate(
  OpenApi.Description,
  "List canonical fact descriptors, optionally filtered by calculator context."
);

const ListRulesEndpoint = HttpApiEndpoint.get("listRules", "/rules", {
  error: CalculatorApiTimeoutEnvelope,
  query: DescriptorFilterQuery,
  success: RulesResponse,
}).annotate(
  OpenApi.Description,
  "List canonical rule descriptors, optionally filtered by calculator context."
);

export class CalculatorApiGroup extends HttpApiGroup.make("calculatorApi")
  .add(GetJurisdictionsEndpoint)
  .add(GetTaxYearsEndpoint)
  .add(ListCalculatorsEndpoint)
  .add(GetCalculatorEndpoint)
  .add(GetCalculatorSchemaEndpoint)
  .add(GetCalculatorGraphEndpoint)
  .add(CalculateEndpoint)
  .add(ListFactsEndpoint)
  .add(ListRulesEndpoint)
  .prefix("/api/v1")
  .annotate(OpenApi.Title, "Calculator API") {}
