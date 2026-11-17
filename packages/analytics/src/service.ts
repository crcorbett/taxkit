import { Context } from "effect";
import type { Effect } from "effect";

import type { AnalyticsCaptureError } from "./errors.js";
import type { CalculatorUse, CaptureDisposition } from "./schemas.js";

export class BackendAnalytics extends Context.Service<
  BackendAnalytics,
  {
    readonly recordCalculatorUse: (
      input: CalculatorUse
    ) => Effect.Effect<CaptureDisposition, AnalyticsCaptureError>;
  }
>()("@taxkit/analytics/BackendAnalytics") {}
