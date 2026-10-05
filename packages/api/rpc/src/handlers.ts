import { PublicCalculatorService } from "@taxkit/calculators/service";
import { Effect, Match } from "effect";

import {
  CalculatorRpcRejected,
  CalculatorRpcVersionMismatch,
} from "./errors.js";
import { TaxKitRpcGroup } from "./group.js";
import { CalculatorRpcVersion } from "./schemas.js";

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
                )
              )
            )
          : Effect.fail(new CalculatorRpcVersionMismatch()),
      ListCalculators: ({ query, version }) =>
        version === CalculatorRpcVersion
          ? calculator.listCalculators(query)
          : Effect.fail(new CalculatorRpcVersionMismatch()),
    });
  })
);
