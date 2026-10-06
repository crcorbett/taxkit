import {
  CalculatorCatalogResponse,
  CalculatorRunRequest,
  CalculatorRunResponse,
  HealthResponse,
} from "@taxkit/api-http";
import { Money, Cents } from "@taxkit/core/primitives";
import {
  AuPayJurisdiction,
  AuPayTaxYear,
  GrossPay,
} from "@taxkit/rules-au-pay";
import { Array, Effect, Option, Record, Schedule } from "effect";
import * as HttpBody from "effect/http/HttpBody";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";

import {
  ApiSmokeOpenApiProjection,
  ApiSmokeRouteError,
  ApiSmokeValidationError,
} from "./schemas.js";

export const waitForApiHealth = (origin: string) =>
  HttpClient.get(new URL("/api/health", origin), { acceptJson: true }).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpIncomingMessage.schemaBodyJson(HealthResponse)),
    Effect.retry(
      Schedule.max([Schedule.spaced("250 millis"), Schedule.recurs(40)])
    ),
    Effect.mapError(
      () =>
        new ApiSmokeRouteError({
          reason: "request-or-response",
          route: "health",
        })
    ),
    Effect.timeoutOrElse({
      duration: "15 seconds",
      orElse: () =>
        Effect.fail(
          new ApiSmokeRouteError({ reason: "timeout", route: "health" })
        ),
    })
  );

export const checkApiCatalog = (origin: string) =>
  HttpClient.get(new URL("/api/v1/calculators", origin), {
    acceptJson: true,
  }).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(
      HttpIncomingMessage.schemaBodyJson(CalculatorCatalogResponse)
    ),
    Effect.mapError(
      () =>
        new ApiSmokeRouteError({
          reason: "request-or-response",
          route: "catalog",
        })
    ),
    Effect.timeoutOrElse({
      duration: "5 seconds",
      orElse: () =>
        Effect.fail(
          new ApiSmokeRouteError({ reason: "timeout", route: "catalog" })
        ),
    }),
    Effect.flatMap((catalog) =>
      Array.findFirst(
        catalog.calculators,
        (calculator) => calculator.calculatorId === "au.pay.take-home"
      ).pipe(
        Option.match({
          onNone: () =>
            Effect.fail(
              new ApiSmokeValidationError({
                message: "Calculator catalog did not include au.pay.take-home.",
              })
            ),
          onSome: () => Effect.void,
        })
      )
    )
  );

export const checkApiCalculation = (origin: string) =>
  HttpBody.jsonSchema(CalculatorRunRequest)({
    facts: {
      grossPay: new GrossPay({
        amount: new Money({ cents: Cents.make(346_200), currency: "AUD" }),
        period: "fortnightly",
      }),
      taxFreeThresholdClaimed: true,
    },
    jurisdiction: Option.some(Option.some(AuPayJurisdiction.make("AU"))),
    taxYear: Option.some(Option.some(AuPayTaxYear.make("2025-26"))),
  }).pipe(
    Effect.flatMap((body) =>
      HttpClient.post(
        new URL("/api/v1/calculators/au.pay.take-home/calculate", origin),
        { acceptJson: true, body }
      )
    ),
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(HttpIncomingMessage.schemaBodyJson(CalculatorRunResponse)),
    Effect.mapError(
      () =>
        new ApiSmokeRouteError({
          reason: "request-or-response",
          route: "calculate",
        })
    ),
    Effect.timeoutOrElse({
      duration: "5 seconds",
      orElse: () =>
        Effect.fail(
          new ApiSmokeRouteError({ reason: "timeout", route: "calculate" })
        ),
    }),
    Effect.flatMap((calculation) =>
      calculation.calculator.calculatorId === "au.pay.take-home"
        ? Effect.void
        : Effect.fail(
            new ApiSmokeValidationError({
              message: "Calculate route returned the wrong calculator id.",
            })
          )
    )
  );

export const checkApiOpenApi = (origin: string) =>
  HttpClient.get(new URL("/api/docs/openapi.json", origin), {
    acceptJson: true,
  }).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(
      HttpIncomingMessage.schemaBodyJson(ApiSmokeOpenApiProjection)
    ),
    Effect.mapError(
      () =>
        new ApiSmokeRouteError({
          reason: "request-or-response",
          route: "openapi",
        })
    ),
    Effect.timeoutOrElse({
      duration: "5 seconds",
      orElse: () =>
        Effect.fail(
          new ApiSmokeRouteError({ reason: "timeout", route: "openapi" })
        ),
    }),
    Effect.flatMap((document) =>
      Record.has(document.paths, "/api/v1/calculators/{calculatorId}/calculate")
        ? Effect.void
        : Effect.fail(
            new ApiSmokeValidationError({
              message: "OpenAPI document did not include the calculate route.",
            })
          )
    )
  );
