import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { CalculatorClientRateKey } from "./admission.schemas.js";
import type {
  CalculatorAdmissionUnavailable,
  CalculatorRateLimited,
} from "./errors.js";

/**
 * The current request's admission identity, as its host derives it. The
 * rate-limited service requires it, so a host that cannot name its caller
 * fails to compose rather than refusing every calculation at run time. No
 * identity for a request is `Option.none` and refuses admission.
 */
export class CalculatorRequestRateKey extends Context.Service<
  CalculatorRequestRateKey,
  {
    readonly current: Effect.Effect<Option.Option<CalculatorClientRateKey>>;
  }
>()("@taxkit/calculators/CalculatorRequestRateKey") {}

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
