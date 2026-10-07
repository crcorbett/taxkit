import { Context } from "effect";
import type { Effect } from "effect";

import type { AnalyticsCaptureError } from "./errors.js";
import type {
  CalculatorUse,
  CaptureDisposition,
  CollectionPolicy,
  PageView,
} from "./schemas.js";

export class BackendAnalytics extends Context.Service<
  BackendAnalytics,
  {
    readonly recordCalculatorUse: (
      input: CalculatorUse
    ) => Effect.Effect<CaptureDisposition, AnalyticsCaptureError>;
  }
>()("@taxkit/analytics/BackendAnalytics") {}
export class BrowserAnalytics extends Context.Service<
  BrowserAnalytics,
  {
    readonly recordPageView: (
      input: PageView
    ) => Effect.Effect<CaptureDisposition, AnalyticsCaptureError>;
    readonly getCollectionPolicy: Effect.Effect<
      CollectionPolicy,
      AnalyticsCaptureError
    >;
  }
>()("@taxkit/analytics/BrowserAnalytics") {}
