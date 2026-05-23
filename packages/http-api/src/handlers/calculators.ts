import { CalculationEngineLive, validateRuleGraph } from "@whattax/core";
import { Array, Effect, Option, Schema, SchemaIssue } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { WhatTaxApi } from "../api.js";
import {
  CalculatorCatalogResponseData,
  JurisdictionsResponseValue,
  PublicCalculationResponseData,
  PublicErrorEnvelopeData,
  PublicSchemaDecodeError,
  SchemaDecodeIssue,
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
        .handle("calculate", ({ params, payload, query }) =>
          getCalculatorCatalogEntry(params.calculatorId).pipe(
            Option.match({
              onNone: () =>
                Effect.fail(
                  new PublicErrorEnvelopeData({
                    error: new UnsupportedCalculatorContextError({
                      context: {
                        jurisdiction: payload.jurisdiction ?? "AU",
                        taxYear: payload.taxYear ?? "2025-26",
                      },
                      message: `${params.calculatorId} is not available for the requested context`,
                      requestedCalculator: params.calculatorId,
                    }),
                  })
                ),
              onSome: (entry) =>
                Effect.gen(function* () {
                  if (
                    payload.jurisdiction !== undefined &&
                    payload.jurisdiction !== entry.context.jurisdiction
                  ) {
                    return yield* Effect.fail(
                      new PublicErrorEnvelopeData({
                        error: new UnsupportedCalculatorContextError({
                          context: {
                            jurisdiction: payload.jurisdiction,
                            taxYear: payload.taxYear ?? "2025-26",
                          },
                          message: `${params.calculatorId} is not available for the requested context`,
                          requestedCalculator: params.calculatorId,
                        }),
                      })
                    );
                  }

                  if (
                    payload.taxYear !== undefined &&
                    payload.taxYear !== entry.context.taxYear
                  ) {
                    return yield* Effect.fail(
                      new PublicErrorEnvelopeData({
                        error: new UnsupportedCalculatorContextError({
                          context: {
                            jurisdiction: payload.jurisdiction ?? "AU",
                            taxYear: payload.taxYear,
                          },
                          message: `${params.calculatorId} is not available for the requested context`,
                          requestedCalculator: params.calculatorId,
                        }),
                      })
                    );
                  }

                  const validationIssues = validateRuleGraph({
                    inputFacts: entry.inputFacts,
                    rules: entry.ruleDescriptors,
                  });
                  const result = yield* entry.calculate(
                    payload.facts,
                    validationIssues
                  );

                  return new PublicCalculationResponseData({
                    calculator: toCalculatorCatalogItem(entry),
                    diagnostics: result.diagnostics,
                    report: result.report,
                  });
                }).pipe(
                  Effect.provide(CalculationEngineLive),
                  Effect.matchEffect({
                    onFailure: (error) => {
                      if (!Schema.isSchemaError(error)) {
                        return Effect.die(error);
                      }

                      return Effect.fail(
                        new PublicErrorEnvelopeData({
                          error: new PublicSchemaDecodeError({
                            ...(query.help === "errors" || query.help === "full"
                              ? {
                                  calculatorId: params.calculatorId,
                                  help: Array.map(entry.inputFacts, (fact) => ({
                                    factId: fact.id,
                                    ...(fact.question === undefined
                                      ? {}
                                      : {
                                          question: fact.question,
                                        }),
                                    title: fact.title,
                                  })),
                                }
                              : {}),
                            issues: Array.map(
                              SchemaIssue.makeFormatterStandardSchemaV1()(
                                error.issue
                              ).issues,
                              (issue) =>
                                new SchemaDecodeIssue({
                                  message: issue.message,
                                  path:
                                    issue.path === undefined
                                      ? Array.empty()
                                      : Array.map(issue.path, (segment) => {
                                          if (
                                            typeof segment === "object" &&
                                            segment !== null &&
                                            "key" in segment
                                          ) {
                                            return String(segment.key);
                                          }

                                          return String(segment);
                                        }),
                                })
                            ),
                            message: `Invalid facts for ${params.calculatorId}`,
                          }),
                        })
                      );
                    },
                    onSuccess: Effect.succeed,
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
