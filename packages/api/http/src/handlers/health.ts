import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { TaxKitApi } from "../api.js";

export const HealthHandlerLive = HttpApiBuilder.group(
  TaxKitApi,
  "health",
  (handlers) =>
    Effect.succeed(
      handlers.handle("getHealth", () =>
        Effect.succeed({
          service: "taxkit" as const,
          status: "ok" as const,
        })
      )
    )
);
