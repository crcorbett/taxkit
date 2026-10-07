import { Context } from "effect";
import type { Effect } from "effect";
import type { HttpServerRequest, HttpServerResponse } from "effect/http";

import type { WebsiteRelayFailure } from "./errors";

// This private transport service owns native request/response capabilities.
// It never exposes a provider client or requirements to a domain package.
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
>()("@taxkit/web/WebsiteAnalyticsRelay") {}
