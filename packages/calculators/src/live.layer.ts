import { CalculationEngine, validateRuleGraph } from "@whattax/core";
import { Array, Effect, Layer, Option, Schema } from "effect";
import { pipe } from "effect/Function";

import type { CalculatorCatalogEntry } from "./catalog.js";
import { getCalculatorCatalogEntry } from "./catalog.js";
import {
  toPublicSchemaDecodeError,
  toUnsupportedCalculatorContextError,
} from "./errors.js";
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
} from "./schemas.js";
import type {
  GetCalculatorGraphRequest,
  GetCalculatorRequest,
  PublicCalculationServiceRequest,
  PublicCalculatorError,
} from "./schemas.js";
import { PublicCalculatorService } from "./service.js";

interface RequestedContext {
  readonly calculatorId: GetCalculatorRequest["calculatorId"];
  readonly jurisdiction: Option.Option<GetCalculatorRequest["jurisdiction"]>;
  readonly taxYear: Option.Option<GetCalculatorRequest["taxYear"]>;
}

const requestedContext = (
  request: GetCalculatorGraphRequest | GetCalculatorRequest
): RequestedContext => ({
  calculatorId: request.calculatorId,
  jurisdiction: Option.fromNullishOr(request.jurisdiction),
  taxYear: Option.fromNullishOr(request.taxYear),
});

const requestedCalculationContext = (
  request: PublicCalculationServiceRequest
): RequestedContext => ({
  calculatorId: request.calculatorId,
  jurisdiction: Option.fromNullishOr(request.payload.jurisdiction),
  taxYear: Option.fromNullishOr(request.payload.taxYear),
});

const validateRequestedJurisdiction = (
  entry: CalculatorCatalogEntry,
  request: RequestedContext
): Effect.Effect<void, PublicCalculatorError> =>
  request.jurisdiction.pipe(
    Option.match({
      onNone: () => Effect.void,
      onSome: (jurisdiction) =>
        jurisdiction === entry.context.jurisdiction
          ? Effect.void
          : Effect.fail(
              toUnsupportedCalculatorContextError({
                calculatorId: request.calculatorId,
                jurisdiction: request.jurisdiction,
                taxYear: request.taxYear,
              })
            ),
    })
  );

const validateRequestedTaxYear = (
  entry: CalculatorCatalogEntry,
  request: RequestedContext
): Effect.Effect<void, PublicCalculatorError> =>
  request.taxYear.pipe(
    Option.match({
      onNone: () => Effect.void,
      onSome: (taxYear) =>
        taxYear === entry.context.taxYear
          ? Effect.void
          : Effect.fail(
              toUnsupportedCalculatorContextError({
                calculatorId: request.calculatorId,
                jurisdiction: request.jurisdiction,
                taxYear: request.taxYear,
              })
            ),
    })
  );

const getCalculatorEntry = (
  request: GetCalculatorGraphRequest | GetCalculatorRequest
): Effect.Effect<CalculatorCatalogEntry, PublicCalculatorError> => {
  const context = requestedContext(request);

  return Effect.fromOption(
    getCalculatorCatalogEntry(context.calculatorId)
  ).pipe(
    Effect.mapError(() => toUnsupportedCalculatorContextError(context)),
    Effect.flatMap((entry) =>
      Effect.gen(function* () {
        yield* validateRequestedJurisdiction(entry, context);
        yield* validateRequestedTaxYear(entry, context);

        return entry;
      })
    )
  );
};

const getCalculationEntry = (
  context: RequestedContext
): Effect.Effect<CalculatorCatalogEntry, PublicCalculatorError> =>
  Effect.fromOption(getCalculatorCatalogEntry(context.calculatorId)).pipe(
    Effect.mapError(() => toUnsupportedCalculatorContextError(context))
  );

const calculateWithEntry = (
  entry: CalculatorCatalogEntry,
  request: PublicCalculationServiceRequest,
  engine: CalculationEngine["Service"]
) =>
  Effect.gen(function* () {
    const context = requestedCalculationContext(request);

    yield* validateRequestedJurisdiction(entry, context);
    yield* validateRequestedTaxYear(entry, context);

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
    Effect.matchEffect({
      onFailure: (error) =>
        Schema.isSchemaError(error)
          ? Effect.fail(
              toPublicSchemaDecodeError({
                calculatorId: request.calculatorId,
                entry,
                help: Option.fromNullishOr(request.help),
                issue: error.issue,
              })
            )
          : Effect.die(error),
      onSuccess: Effect.succeed,
    })
  );

export const PublicCalculatorServiceLive = Layer.effect(
  PublicCalculatorService
)(
  Effect.gen(function* () {
    const engine = yield* CalculationEngine;

    return PublicCalculatorService.of({
      calculate: (request) =>
        Effect.suspend(() => {
          const context = requestedCalculationContext(request);

          return getCalculationEntry(context).pipe(
            Effect.flatMap((entry) =>
              calculateWithEntry(entry, request, engine)
            )
          );
        }),
      getCalculator: (request) =>
        getCalculatorEntry(request).pipe(Effect.map(toCalculatorCatalogItem)),
      getCalculatorGraph: (request) =>
        getCalculatorEntry(request).pipe(
          Effect.map((entry) =>
            toCalculatorGraphResponse({
              entry,
              validationIssues: validateRuleGraph({
                inputFacts: entry.inputFacts,
                rules: entry.ruleDescriptors,
              }),
            })
          )
        ),
      getCalculatorSchema: (request) =>
        getCalculatorEntry(request).pipe(
          Effect.map(toCalculatorSchemaResponse)
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
