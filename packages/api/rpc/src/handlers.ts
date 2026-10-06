import type {
  CalculatorRequestError,
  CalculatorMetadataError,
} from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { Effect, Match } from "effect";

import {
  CalculatorRpcRejected,
  CalculatorRpcVersionMismatch,
} from "./errors.js";
import { TaxKitRpcGroup } from "./group.js";
import { CalculatorRpcVersion } from "./schemas.js";

// Reused at the four request-error boundaries. Discard private issue paths,
// contexts and messages; retain only the fixed caller-action reason.
const calculatorRpcRequestFailure = (error: CalculatorRequestError) =>
  Match.value(error).pipe(
    Match.tag(
      "CalculatorInputDecodeError",
      () => new CalculatorRpcRejected({ reason: "input" })
    ),
    Match.tag(
      "UnsupportedCalculatorContextError",
      () => new CalculatorRpcRejected({ reason: "context" })
    ),
    Match.tag(
      "UnsupportedCalculatorError",
      () => new CalculatorRpcRejected({ reason: "unsupported" })
    ),
    Match.tag(
      "CalculationError",
      () => new CalculatorRpcRejected({ reason: "calculation" })
    ),
    Match.exhaustive
  );

// Metadata preserves its checked timeout while retaining the same private-safe
// projection for lookup failures at all three metadata request boundaries.
const calculatorRpcMetadataFailure = (error: CalculatorMetadataError) =>
  Match.value(error).pipe(
    Match.tag("CalculatorOperationTimedOut", (failure) => failure),
    Match.orElse(calculatorRpcRequestFailure)
  );

export const TaxKitRpcHandlersLive = TaxKitRpcGroup.toLayer(
  Effect.gen(function* () {
    const calculator = yield* PublicCalculatorService;
    return TaxKitRpcGroup.of({
      Calculate: ({ request, version }) =>
        version === CalculatorRpcVersion
          ? calculator.calculate(request).pipe(
              Effect.mapError((error) =>
                Match.value(error).pipe(
                  Match.tag(
                    "CalculatorRateLimited",
                    "CalculatorAdmissionUnavailable",
                    "CalculatorCapacityExceeded",
                    "CalculatorOperationTimedOut",
                    (failure) => failure
                  ),
                  Match.orElse(calculatorRpcRequestFailure)
                )
              )
            )
          : Effect.fail(new CalculatorRpcVersionMismatch()),
      GetCalculator: ({ request, version }) =>
        version === CalculatorRpcVersion
          ? calculator
              .getCalculator(request)
              .pipe(Effect.mapError(calculatorRpcMetadataFailure))
          : Effect.fail(new CalculatorRpcVersionMismatch()),
      GetCalculatorGraph: ({ request, version }) =>
        version === CalculatorRpcVersion
          ? calculator
              .getCalculatorGraph(request)
              .pipe(Effect.mapError(calculatorRpcMetadataFailure))
          : Effect.fail(new CalculatorRpcVersionMismatch()),
      GetCalculatorSchema: ({ request, version }) =>
        version === CalculatorRpcVersion
          ? calculator
              .getCalculatorSchema(request)
              .pipe(Effect.mapError(calculatorRpcMetadataFailure))
          : Effect.fail(new CalculatorRpcVersionMismatch()),
      ListCalculators: ({ query, version }) =>
        version === CalculatorRpcVersion
          ? calculator.listCalculators(query)
          : Effect.fail(new CalculatorRpcVersionMismatch()),
      ListFacts: ({ query, version }) =>
        version === CalculatorRpcVersion
          ? calculator.listFacts(query)
          : Effect.fail(new CalculatorRpcVersionMismatch()),
      ListJurisdictions: ({ version }) =>
        version === CalculatorRpcVersion
          ? calculator.listJurisdictions()
          : Effect.fail(new CalculatorRpcVersionMismatch()),
      ListRules: ({ query, version }) =>
        version === CalculatorRpcVersion
          ? calculator.listRules(query)
          : Effect.fail(new CalculatorRpcVersionMismatch()),
      ListTaxYears: ({ query, version }) =>
        version === CalculatorRpcVersion
          ? calculator.listTaxYears(query)
          : Effect.fail(new CalculatorRpcVersionMismatch()),
    });
  })
);
