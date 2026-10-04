import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { Effect, ErrorReporter, Schema } from "effect";
import { HttpServerError, HttpServerResponse } from "effect/http";

import { appRuntime } from "./runtime.server";
import { WebsiteSettingsTransport } from "./schemas";
import { WebsiteServerApplication } from "./service.server";

export const loadWebsiteSettingsServer = () =>
  appRuntime.runPromise(
    WebsiteServerApplication.pipe(
      Effect.flatMap((application) => application.settings),
      Effect.result,
      Effect.flatMap(Schema.encodeEffect(WebsiteSettingsTransport)),
      Effect.orDie,
      // Expected settings errors remain checked values. An unexpected failure
      // reaches the host reporter and native empty response before TanStack can
      // log or serialise an arbitrary Cause as a server-function error.
      Effect.catchCause((cause) =>
        HttpServerError.causeResponse(cause).pipe(
          Effect.flatMap(([response, reportable]) =>
            ErrorReporter.report(reportable).pipe(
              Effect.as(HttpServerResponse.toWeb(response))
            )
          )
        )
      )
    ),
    { signal: getRequest().signal }
  );
