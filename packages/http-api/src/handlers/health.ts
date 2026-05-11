import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { WhatTaxApi } from "../api.js";

export const HealthHandlerLive = HttpApiBuilder.group(
  WhatTaxApi,
  "health",
  (handlers) =>
    Effect.succeed(
      handlers.handle("getHealth", () =>
        Effect.succeed({
          status: "ok" as const,
          service: "whattax" as const,
        })
      )
    )
);
