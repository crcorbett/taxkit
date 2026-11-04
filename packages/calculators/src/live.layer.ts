import { CalculationEngine, validateRuleGraph } from "@taxkit/core";
import { AuAnnualIncomeTaxCalculation } from "@taxkit/rules-au-income-tax";
import {
  AuPayTakeHomeCalculation,
  AuPayWithholdingsCalculation,
} from "@taxkit/rules-au-pay";
import { Function as EffectFunction, Array, Effect, Layer } from "effect";
import { pipe } from "effect/Function";

import type { CalculatorCatalogEntry } from "./catalog.js";
import { getCalculatorCatalogEntry } from "./catalog.js";
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
import type {
  TakeHomeCalculationRequest,
  WithholdingsCalculationRequest,
  AnnualTaxCalculationRequest,
} from "./schemas.js";
import {
  CalculatorCatalogResponseData,
  DescriptorFilterQuery,
  CalculatorRunRequest,
  UnsupportedCalculatorContextError,
} from "./schemas.js";
import { PublicCalculatorService } from "./service.js";
/**
 * Runs a public calculation for a resolved catalog entry.
 *
 * The catalog entry owns the rule descriptors, input fact schema and report
 * schema. This keeps calculation policy in the service layer so HTTP handlers
 * can stay thin transport adapters.
 */
const calculateWithEntry = ({
  entry,
  request,
  engine,
}: {
  readonly entry: CalculatorCatalogEntry;
  readonly request: CalculatorRunRequest;
  readonly engine: CalculationEngine["Service"];
}) =>
  CalculatorRunRequest.match(request, {
    "au.pay.take-home": (selected: typeof TakeHomeCalculationRequest.Type) =>
      AuPayTakeHomeCalculation.calculate(selected.payload.facts).pipe(
        Effect.map((run) => ({
          ...run,
          calculatorId: selected.calculatorId,
          calculator: {
            ...toCalculatorCatalogItem(entry),
            calculatorId: selected.calculatorId,
          },
        }))
      ),
    "au.pay.withholdings": (
      selected: typeof WithholdingsCalculationRequest.Type
    ) =>
      AuPayWithholdingsCalculation.calculate(selected.payload.facts).pipe(
        Effect.map((run) => ({
          ...run,
          calculatorId: selected.calculatorId,
          calculator: {
            ...toCalculatorCatalogItem(entry),
            calculatorId: selected.calculatorId,
          },
        }))
      ),
    "au.income-tax.annual": (
      selected: typeof AnnualTaxCalculationRequest.Type
    ) =>
      AuAnnualIncomeTaxCalculation.calculate(selected.payload.facts).pipe(
        Effect.map((run) => ({
          ...run,
          calculatorId: selected.calculatorId,
          calculator: {
            ...toCalculatorCatalogItem(entry),
            calculatorId: selected.calculatorId,
          },
        }))
      ),
  }).pipe(Effect.provideService(CalculationEngine, engine));
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
      calculate: Effect.fn("PublicCalculatorService.calculate")((request) =>
        getCalculatorCatalogEntry(request.calculatorId, request.payload).pipe(
          Effect.fromOption,
          Effect.mapError(
            () =>
              new UnsupportedCalculatorContextError({
                context: request.payload,
                message: `${request.calculatorId} is not available for the requested context`,
                requestedCalculator: request.calculatorId,
              })
          ),
          Effect.flatMap((entry) =>
            calculateWithEntry({
              entry,
              request,
              engine,
            })
          )
        )
      ),
      getCalculator: Effect.fn("PublicCalculatorService.getCalculator")(
        (request) =>
          getCalculatorCatalogEntry(request.calculatorId, request).pipe(
            Effect.fromOption,
            Effect.map((entry) => toCalculatorCatalogItem(entry)),
            Effect.catchTag("NoSuchElementError", () =>
              Effect.fail(
                new UnsupportedCalculatorContextError({
                  context: request,
                  message: `${request.calculatorId} is not available for the requested context`,
                  requestedCalculator: request.calculatorId,
                })
              )
            )
          )
      ),
      getCalculatorGraph: Effect.fn(
        "PublicCalculatorService.getCalculatorGraph"
      )((request) =>
        getCalculatorCatalogEntry(request.calculatorId, request).pipe(
          Effect.fromOption,
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
        )
      ),
      getCalculatorSchema: Effect.fn(
        "PublicCalculatorService.getCalculatorSchema"
      )((request) =>
        getCalculatorCatalogEntry(request.calculatorId, request).pipe(
          Effect.fromOption,
          Effect.map((entry) => toCalculatorSchemaResponse(entry)),
          Effect.catchTag("NoSuchElementError", () =>
            Effect.fail(
              new UnsupportedCalculatorContextError({
                context: request,
                message: `${request.calculatorId} is not available for the requested context`,
                requestedCalculator: request.calculatorId,
              })
            )
          )
        )
      ),
      listCalculators: Effect.fn("PublicCalculatorService.listCalculators")(
        (query) =>
          Effect.succeed(
            pipe(
              query,
              (value) => DescriptorFilterQuery.make(value),
              filterCalculatorEntries,
              (entries) =>
                new CalculatorCatalogResponseData({
                  calculators: EffectFunction.pipe(
                    entries,
                    Array.map(toCalculatorCatalogItem)
                  ),
                })
            )
          )
      ),
      listFacts: Effect.fn("PublicCalculatorService.listFacts")((query) =>
        Effect.succeed(pipe(query, filterCalculatorEntries, toFactsResponse))
      ),
      listJurisdictions: Effect.fn("PublicCalculatorService.listJurisdictions")(
        () => Effect.succeed(JurisdictionsResponseValue)
      ),
      listRules: Effect.fn("PublicCalculatorService.listRules")((query) =>
        Effect.succeed(pipe(query, filterCalculatorEntries, toRulesResponse))
      ),
      listTaxYears: Effect.fn("PublicCalculatorService.listTaxYears")(() =>
        Effect.succeed(TaxYearsResponseValue)
      ),
    });
  })
);
