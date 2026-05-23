import { validateRuleGraph } from "@whattax/core";
import { Array, Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { WhatTaxApi } from "../api.js";
import {
  CalculatorCatalogResponseData,
  JurisdictionsResponseValue,
  PublicErrorEnvelopeData,
  TaxYearsResponseValue,
  UnsupportedCalculatorContextError,
  filterCalculatorEntries,
  getCalculatorCatalogEntry,
  toCalculatorCatalogItem,
  toCalculatorGraphResponse,
  toCalculatorSchemaResponse,
  toFactsResponse,
  toRulesResponse,
} from "../groups/calculators.js";

export const PublicCalculationMetadataHandlerLive = HttpApiBuilder.group(
  WhatTaxApi,
  "publicCalculationMetadata",
  (handlers) =>
    Effect.succeed(
      handlers
        .handle("getJurisdictions", () =>
          Effect.succeed(JurisdictionsResponseValue)
        )
        .handle("getTaxYears", ({ query }) =>
          Effect.succeed(
            query.jurisdiction === undefined || query.jurisdiction === "AU"
              ? TaxYearsResponseValue
              : { taxYears: [] }
          )
        )
        .handle("listCalculators", ({ query }) =>
          Effect.succeed(
            new CalculatorCatalogResponseData({
              calculators: Array.map(
                filterCalculatorEntries(query),
                toCalculatorCatalogItem
              ),
            })
          )
        )
        .handle("getCalculator", ({ params, query }) =>
          getCalculatorCatalogEntry(params.calculatorId).pipe(
            Option.match({
              onNone: () =>
                Effect.fail(
                  new PublicErrorEnvelopeData({
                    error: new UnsupportedCalculatorContextError({
                      context: {
                        jurisdiction: query.jurisdiction ?? "AU",
                        taxYear: query.taxYear ?? "2025-26",
                      },
                      message: `${params.calculatorId} is not available for the requested context`,
                      requestedCalculator: params.calculatorId,
                    }),
                  })
                ),
              onSome: (entry) => Effect.succeed(toCalculatorCatalogItem(entry)),
            })
          )
        )
        .handle("getCalculatorSchema", ({ params, query }) =>
          getCalculatorCatalogEntry(params.calculatorId).pipe(
            Option.match({
              onNone: () =>
                Effect.fail(
                  new PublicErrorEnvelopeData({
                    error: new UnsupportedCalculatorContextError({
                      context: {
                        jurisdiction: query.jurisdiction ?? "AU",
                        taxYear: query.taxYear ?? "2025-26",
                      },
                      message: `${params.calculatorId} is not available for the requested context`,
                      requestedCalculator: params.calculatorId,
                    }),
                  })
                ),
              onSome: (entry) =>
                Effect.succeed(toCalculatorSchemaResponse(entry)),
            })
          )
        )
        .handle("getCalculatorGraph", ({ params, query }) =>
          getCalculatorCatalogEntry(params.calculatorId).pipe(
            Option.match({
              onNone: () =>
                Effect.fail(
                  new PublicErrorEnvelopeData({
                    error: new UnsupportedCalculatorContextError({
                      context: {
                        jurisdiction: query.jurisdiction ?? "AU",
                        taxYear: query.taxYear ?? "2025-26",
                      },
                      message: `${params.calculatorId} is not available for the requested context`,
                      requestedCalculator: params.calculatorId,
                    }),
                  })
                ),
              onSome: (entry) =>
                Effect.succeed(
                  toCalculatorGraphResponse({
                    entry,
                    validationIssues: validateRuleGraph({
                      inputFacts: entry.inputFacts,
                      rules: entry.ruleDescriptors,
                    }),
                  })
                ),
            })
          )
        )
        .handle("listFacts", ({ query }) =>
          Effect.succeed(toFactsResponse(filterCalculatorEntries(query)))
        )
        .handle("listRules", ({ query }) =>
          Effect.succeed(toRulesResponse(filterCalculatorEntries(query)))
        )
    )
);
