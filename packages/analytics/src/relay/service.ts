import { Context } from "effect";
import type { Effect } from "effect";
import type { HttpServerRequest, HttpServerResponse } from "effect/http";

import type { WebsiteRelayFailure } from "./errors.js";

// The analytics transport contract uses native HTTP request/response values.
// The Website host owns runtime execution and supplies its request lifecycle.
export class WebsiteAnalyticsRelay extends Context.Service<
  WebsiteAnalyticsRelay,
  {
    readonly handle: (
      request: HttpServerRequest.HttpServerRequest
    ) => Effect.Effect<
      HttpServerResponse.HttpServerResponse,
      WebsiteRelayFailure
    >;
  }
>()("@taxkit/analytics/WebsiteAnalyticsRelay") {}
