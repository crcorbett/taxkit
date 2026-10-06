import { Context, Option } from "effect";
import type { Effect } from "effect";

import type { CalculatorClientRateKey } from "./admission.schemas.js";
import type {
  CalculatorAdmissionUnavailable,
  CalculatorRateLimited,
} from "./schemas.js";

export const CalculatorRequestRateKey = Context.Reference<
  Option.Option<CalculatorClientRateKey>
>("@taxkit/calculators/CalculatorRequestRateKey", {
  defaultValue: Option.none,
});

export class CalculatorAdmission extends Context.Service<
  CalculatorAdmission,
  {
    readonly admitCalculation: (
      key: CalculatorClientRateKey
    ) => Effect.Effect<
      void,
      CalculatorRateLimited | CalculatorAdmissionUnavailable
    >;
  }
>()("@taxkit/calculators/CalculatorAdmission") {}
