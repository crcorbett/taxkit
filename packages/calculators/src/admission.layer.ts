import { Effect, Layer, Option } from "effect";

import {
  CalculatorAdmission,
  CalculatorRequestRateKey,
} from "./admission.service.js";
import { CalculatorAdmissionUnavailable } from "./schemas.js";
import { PublicCalculatorService } from "./service.js";
// The native host builds this once below its existing work/time bound. Direct
// engine and local SDK callers keep the original calculator implementation.
export const PublicCalculatorServiceRateLimited = Layer.effect(
  PublicCalculatorService,
  Effect.gen(function* () {
    const calculator = yield* PublicCalculatorService;
    const admission = yield* CalculatorAdmission;
    return PublicCalculatorService.of({
      getCalculator: Effect.fn("PublicCalculatorService.getCalculator")(
        calculator.getCalculator
      ),
      getCalculatorGraph: Effect.fn(
        "PublicCalculatorService.getCalculatorGraph"
      )(calculator.getCalculatorGraph),
      getCalculatorSchema: Effect.fn(
        "PublicCalculatorService.getCalculatorSchema"
      )(calculator.getCalculatorSchema),
      listCalculators: Effect.fn("PublicCalculatorService.listCalculators")(
        calculator.listCalculators
      ),
      listFacts: Effect.fn("PublicCalculatorService.listFacts")(
        calculator.listFacts
      ),
      listJurisdictions: Effect.fn("PublicCalculatorService.listJurisdictions")(
        calculator.listJurisdictions
      ),
      listRules: Effect.fn("PublicCalculatorService.listRules")(
        calculator.listRules
      ),
      listTaxYears: Effect.fn("PublicCalculatorService.listTaxYears")(
        calculator.listTaxYears
      ),
      calculate: Effect.fn("PublicCalculatorService.calculate")((request) =>
        CalculatorRequestRateKey.pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new CalculatorAdmissionUnavailable()),
              onSome: admission.admitCalculation,
            })
          ),
          Effect.andThen(Effect.suspend(() => calculator.calculate(request)))
        )
      ),
    });
  })
);
