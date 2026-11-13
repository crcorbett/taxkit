import { validateRuleGraph } from "@taxkit/core";
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
import {
  CalculatorCatalogResponseData,
  DescriptorFilterQuery,
  CalculatorRunRequest,
  CalculatorId,
  UnsupportedCalculatorContextError,
} from "./schemas.js";
import { CalculatorCatalogue } from "./service.js";
import {
  CalculatorUsageDisabled,
  PublicCalculatorServiceBounded,
} from "./work.layer.js";
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
}: {
  readonly entry: CalculatorCatalogEntry;
  readonly request: CalculatorRunRequest;
}) =>
  CalculatorRunRequest.match(request, {
    "au.pay.take-home": (selected) =>
      AuPayTakeHomeCalculation.calculate(selected.payload.facts).pipe(
        Effect.map((run) => ({
          ...run,
          calculatorId: selected.calculatorId,
          calculator: {
            ...toCalculatorCatalogItem(entry),
            calculatorId: AuPayTakeHomeCalculation.calculatorId,
          },
        }))
      ),
    "au.pay.withholdings": (selected) =>
      AuPayWithholdingsCalculation.calculate(selected.payload.facts).pipe(
        Effect.map((run) => ({
          ...run,
          calculatorId: selected.calculatorId,
          calculator: {
            ...toCalculatorCatalogItem(entry),
            calculatorId: AuPayWithholdingsCalculation.calculatorId,
          },
        }))
      ),
    "au.income-tax.annual": (selected) =>
      AuAnnualIncomeTaxCalculation.calculate(selected.payload.facts).pipe(
        Effect.map((run) => ({
          ...run,
          calculatorId: selected.calculatorId,
          calculator: {
            ...toCalculatorCatalogItem(entry),
            calculatorId: AuAnnualIncomeTaxCalculation.calculatorId,
          },
        }))
      ),
  });
/**
 * The static calculator catalogue implementation.
 *
 * Invalid literal values are rejected by the request schemas before it runs.
 * Missing calculator ids are mapped inline in each method so the error
 * includes the request shape that the caller provided.
 */
export const calculatorCatalogue = CalculatorCatalogue.of({
  calculate: Effect.fn("CalculatorCatalogue.calculate")((request) => {
    const calculatorId = CalculatorId.make(request.calculatorId);
    return getCalculatorCatalogEntry(calculatorId, request.payload).pipe(
      Effect.fromOption,
      Effect.mapError(
        () =>
          new UnsupportedCalculatorContextError({
            context: request.payload,
            message: `${request.calculatorId} is not available for the requested context`,
            requestedCalculator: calculatorId,
          })
      ),
      Effect.flatMap((entry) =>
        calculateWithEntry({
          entry,
          request,
        })
      )
    );
  }),
  getCalculator: Effect.fn("CalculatorCatalogue.getCalculator")((request) =>
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
  getCalculatorGraph: Effect.fn("CalculatorCatalogue.getCalculatorGraph")(
    (request) =>
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
  getCalculatorSchema: Effect.fn("CalculatorCatalogue.getCalculatorSchema")(
    (request) =>
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
  listCalculators: Effect.fn("CalculatorCatalogue.listCalculators")((query) =>
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
  listFacts: Effect.fn("CalculatorCatalogue.listFacts")((query) =>
    Effect.succeed(pipe(query, filterCalculatorEntries, toFactsResponse))
  ),
  listJurisdictions: Effect.fn("CalculatorCatalogue.listJurisdictions")(() =>
    Effect.succeed(JurisdictionsResponseValue)
  ),
  listRules: Effect.fn("CalculatorCatalogue.listRules")((query) =>
    Effect.succeed(pipe(query, filterCalculatorEntries, toRulesResponse))
  ),
  listTaxYears: Effect.fn("CalculatorCatalogue.listTaxYears")(() =>
    Effect.succeed(TaxYearsResponseValue)
  ),
});

export const CalculatorCatalogueLive = Layer.succeed(
  CalculatorCatalogue,
  calculatorCatalogue
);
/**
 * The public calculator service over the static catalogue, with the shared
 * work budget and no rate admission. The native API composes its rate-limited
 * implementation instead.
 */
export const PublicCalculatorServiceLive = PublicCalculatorServiceBounded.pipe(
  Layer.provide(CalculatorCatalogueLive),
  Layer.provide(CalculatorUsageDisabled)
);
