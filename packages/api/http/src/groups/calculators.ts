import {
  CalculatorCapacityExceeded,
  CalculatorRateLimited,
  CalculatorAdmissionUnavailable,
  CalculatorOperationTimedOut,
  CalculatorMetadataError,
  CalculatorRequestError,
  CalculatorServiceError,
} from "@taxkit/calculators/errors";
import {
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorGraphResponse,
  CalculatorId,
  CalculatorSchemaResponse,
  DescriptorFilterQuery,
  FactsResponse,
  HelpQuery,
  JurisdictionsResponse,
  MetadataQuery,
  CalculatorRunRequest,
  CalculatorRunResponse,
  RulesResponse,
  TaxYearsResponse,
} from "@taxkit/calculators/schemas";
import { Data, Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import {
  CalculatorRequestBodyTimedOut,
  CalculatorRequestBodyTooLarge,
} from "../errors.js";
import { calculatorPaths } from "../routes.js";

// The declaration imports only Schemas, so browser clients built from it never
// include calculator implementations.
export {
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorContext,
  CalculatorId,
  CalculatorRunReport,
  CalculatorRunRequest,
  CalculatorRunResponse,
  HelpMode,
} from "@taxkit/calculators/schemas";

const CalculatorApiRequestErrorEnvelope = Schema.Struct({
  error: CalculatorRequestError,
}).pipe(HttpApiSchema.status("BadRequest"));

// Metadata lookups are synchronous catalogue projections; they fail only for a
// calculator/context outside the catalogue and have no time budget.
const CalculatorApiMetadataErrorEnvelope = Schema.Struct({
  error: CalculatorMetadataError,
}).pipe(HttpApiSchema.status("BadRequest"));

const CalculatorApiRateLimitEnvelope = Schema.Struct({
  error: CalculatorRateLimited,
});
const CalculatorApiRateLimitHeaders = { "retry-after": Schema.Literal("60") };

const CalculatorApiErrorEnvelopes = [
  CalculatorApiRequestErrorEnvelope,
  CalculatorApiRateLimitEnvelope.pipe(
    // The native curried helper cannot infer its source Schema from S["Type"].
    // Preserve the source and its service-free contract explicitly.
    HttpApiSchema.encodeToWithHeaders<
      typeof CalculatorApiRateLimitEnvelope,
      typeof CalculatorApiRateLimitEnvelope,
      typeof CalculatorApiRateLimitHeaders
    >(
      {
        body: CalculatorApiRateLimitEnvelope.pipe(HttpApiSchema.status(429)),
        headers: CalculatorApiRateLimitHeaders,
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
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- The inherited Data.Class constructor preserves the specific error.
  E extends CalculatorServiceError = CalculatorServiceError,
> extends Data.Class<CalculatorApiErrorEnvelope & { readonly error: E }> {}

const CalculatorParams = Schema.Struct({
  calculatorId: CalculatorId,
});

const GetJurisdictionsEndpoint = HttpApiEndpoint.get(
  "getJurisdictions",
  calculatorPaths.jurisdictions,
  {
    success: JurisdictionsResponse,
  }
).annotate(OpenApi.Description, "List supported public API jurisdictions.");

const GetTaxYearsEndpoint = HttpApiEndpoint.get(
  "getTaxYears",
  calculatorPaths.taxYears,
  {
    query: MetadataQuery,
    success: TaxYearsResponse,
  }
).annotate(OpenApi.Description, "List supported tax years for a jurisdiction.");

const ListCalculatorsEndpoint = HttpApiEndpoint.get(
  "listCalculators",
  calculatorPaths.calculators,
  {
    query: MetadataQuery,
    success: CalculatorCatalogResponse,
  }
).annotate(OpenApi.Description, "List public calculator catalog entries.");

const GetCalculatorEndpoint = HttpApiEndpoint.get(
  "getCalculator",
  calculatorPaths.calculator,
  {
    error: CalculatorApiMetadataErrorEnvelope,
    params: CalculatorParams,
    query: HelpQuery,
    success: CalculatorCatalogItem,
  }
).annotate(OpenApi.Description, "Return one public calculator catalog entry.");

const GetCalculatorSchemaEndpoint = HttpApiEndpoint.get(
  "getCalculatorSchema",
  calculatorPaths.schema,
  {
    error: CalculatorApiMetadataErrorEnvelope,
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
  calculatorPaths.graph,
  {
    error: CalculatorApiMetadataErrorEnvelope,
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
  calculatorPaths.calculate,
  {
    error: CalculatorApiErrorEnvelopes,
    params: CalculatorParams,
    payload: CalculatorRunRequest,
    success: CalculatorRunResponse,
  }
)
  .annotate(HttpApi.PayloadParseOptions, {
    onExcessProperty: "error",
    errors: "all",
  })
  .annotate(
    OpenApi.Description,
    "Run one public calculator using canonical scenario decoding and rule-pack layers."
  );

const ListFactsEndpoint = HttpApiEndpoint.get(
  "listFacts",
  calculatorPaths.facts,
  {
    query: DescriptorFilterQuery,
    success: FactsResponse,
  }
).annotate(
  OpenApi.Description,
  "List canonical fact descriptors, optionally filtered by calculator context."
);

const ListRulesEndpoint = HttpApiEndpoint.get(
  "listRules",
  calculatorPaths.rules,
  {
    query: DescriptorFilterQuery,
    success: RulesResponse,
  }
).annotate(
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
  .annotate(OpenApi.Title, "Calculator API") {}
