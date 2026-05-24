import { CalculationEngine, validateRuleGraph } from "@whattax/core";
import { Array, Effect, Layer, Option, Schema } from "effect";
import { pipe } from "effect/Function";

import type { CalculatorCatalogEntry } from "./catalog.js";
import { getCalculatorCatalogEntry } from "./catalog.js";
import { toCalculatorInputDecodeError } from "./errors.js";
import {
  JurisdictionsResponseValue,
  TaxYearsResponseValue,
  filterCalculatorEntries,
  toCalculatorCatalogItem,
  toCalculatorGraphResponse,
  toCalculatorSchemaResponse,
  toFactsResponse,
  toRulesResponse,
} from "./metadata.js";
import {
  CalculatorCatalogResponseData,
  PublicCalculationResponseData,
  UnsupportedCalculatorContextError,
} from "./schemas.js";
import type { PublicCalculationServiceRequest } from "./schemas.js";
import { PublicCalculatorService } from "./service.js";

/**
 * Runs a public calculation for a resolved catalog entry.
 *
 * The catalog entry owns the rule descriptors, input fact schema and report
 * schema. This keeps calculation policy in the service layer so HTTP handlers
 * can stay thin transport adapters.
 */
const calculateWithEntry = (
  entry: CalculatorCatalogEntry,
  request: PublicCalculationServiceRequest,
  engine: CalculationEngine["Service"]
) =>
  Effect.gen(function* () {
    // Graph validation is deterministic metadata, so expose it beside the
    // calculation result instead of hiding it behind request transport logic.
    const validationIssues = validateRuleGraph({
      inputFacts: entry.inputFacts,
      rules: entry.ruleDescriptors,
    });
    const result = yield* entry
      .calculate(request.payload.facts, validationIssues)
      .pipe(Effect.provideService(CalculationEngine, engine));

    return new PublicCalculationResponseData({
      calculator: toCalculatorCatalogItem(entry),
      diagnostics: result.diagnostics,
      report: result.report,
    });
  }).pipe(
    Effect.catchIf(Schema.isSchemaError, (error) =>
      Effect.fail(
        toCalculatorInputDecodeError({
          calculatorId: request.calculatorId,
          entry,
          help: Option.fromNullishOr(request.help),
          issue: error.issue,
        })
      )
    )
  );

/**
 * Live public calculator service backed by the static calculator catalog.
 *
 * Invalid literal values are rejected by the request schemas before this layer
 * runs. Missing calculator ids are mapped inline in each method so the error
 * includes the request shape that the caller provided.
 */
export const PublicCalculatorServiceLive = Layer.effect(
  PublicCalculatorService
)(
  Effect.gen(function* () {
    const engine = yield* CalculationEngine;

    return PublicCalculatorService.of({
      calculate: (request) =>
        Effect.fromOption(getCalculatorCatalogEntry(request.calculatorId)).pipe(
          Effect.mapError(
            () =>
              new UnsupportedCalculatorContextError({
                context: request.payload,
                message: `${request.calculatorId} is not available for the requested context`,
                requestedCalculator: request.calculatorId,
              })
          ),
          Effect.flatMap((entry) => calculateWithEntry(entry, request, engine))
        ),
      getCalculator: (request) =>
        Effect.fromOption(getCalculatorCatalogEntry(request.calculatorId)).pipe(
          Effect.map(toCalculatorCatalogItem),
          Effect.catchTag("NoSuchElementError", () =>
            Effect.fail(
              new UnsupportedCalculatorContextError({
                context: request,
                message: `${request.calculatorId} is not available for the requested context`,
                requestedCalculator: request.calculatorId,
              })
            )
          )
        ),
      getCalculatorGraph: (request) =>
        Effect.fromOption(getCalculatorCatalogEntry(request.calculatorId)).pipe(
          Effect.map((entry) =>
            toCalculatorGraphResponse({
              entry,
              validationIssues: validateRuleGraph({
                inputFacts: entry.inputFacts,
                rules: entry.ruleDescriptors,
              }),
            })
          ),
          Effect.catchTag("NoSuchElementError", () =>
            Effect.fail(
              new UnsupportedCalculatorContextError({
                context: request,
                message: `${request.calculatorId} is not available for the requested context`,
                requestedCalculator: request.calculatorId,
              })
            )
          )
        ),
      getCalculatorSchema: (request) =>
        Effect.fromOption(getCalculatorCatalogEntry(request.calculatorId)).pipe(
          Effect.map(toCalculatorSchemaResponse),
          Effect.catchTag("NoSuchElementError", () =>
            Effect.fail(
              new UnsupportedCalculatorContextError({
                context: request,
                message: `${request.calculatorId} is not available for the requested context`,
                requestedCalculator: request.calculatorId,
              })
            )
          )
        ),
      listCalculators: (query) =>
        Effect.succeed(
          pipe(
            query,
            filterCalculatorEntries,
            (entries) =>
              new CalculatorCatalogResponseData({
                calculators: Array.map(entries, toCalculatorCatalogItem),
              })
          )
        ),
      listFacts: (query) =>
        Effect.succeed(pipe(query, filterCalculatorEntries, toFactsResponse)),
      listJurisdictions: () => Effect.succeed(JurisdictionsResponseValue),
      listRules: (query) =>
        Effect.succeed(pipe(query, filterCalculatorEntries, toRulesResponse)),
      listTaxYears: () => Effect.succeed(TaxYearsResponseValue),
    });
  })
);
