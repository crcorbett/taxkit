import { fileURLToPath } from "node:url";

import * as BunHttpClient from "@effect/platform-bun/BunHttpClient";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  CalculatorCatalogResponse,
  CalculatorRunRequest,
  CalculatorRunResponse,
} from "@whattax/api-http";
import { aud } from "@whattax/core/primitives";
import { GrossPay } from "@whattax/rules-au-pay";
import {
  Array,
  Console,
  Data,
  Effect,
  Layer,
  Match,
  Option,
  Schedule,
  Schema,
} from "effect";
import * as HttpBody from "effect/unstable/http/HttpBody";
import * as HttpClient from "effect/unstable/http/HttpClient";
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";
import { ChildProcess } from "effect/unstable/process";

const smokeHost = "127.0.0.1";
const smokePort = 4173;
const smokeOrigin = `http://${smokeHost}:${smokePort}`;
const takeHomeCalculatorId = "au.pay.take-home";
const appRoot = fileURLToPath(new URL("..", import.meta.url));

class SmokeRouteError extends Data.TaggedError("SmokeRouteError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly route: string;
  readonly status?: number;
}> {}

const routeUrl = (path: string) => new URL(path, smokeOrigin).toString();

const requireOkResponse = (
  route: string,
  response: HttpClientResponse.HttpClientResponse
) =>
  Match.value(response.status).pipe(
    Match.when(
      (status) => status >= 200 && status < 300,
      () => Effect.succeed(response)
    ),
    Match.orElse((status) =>
      Effect.fail(
        new SmokeRouteError({
          message: `Expected a 2xx response from ${route}`,
          route,
          status,
        })
      )
    )
  );

const decodeRouteJson = <RouteSchema extends Schema.Top>(
  route: string,
  response: HttpClientResponse.HttpClientResponse,
  schema: RouteSchema
) =>
  requireOkResponse(route, response).pipe(
    Effect.flatMap((okResponse) =>
      okResponse.json.pipe(
        Effect.mapError(
          (cause) =>
            new SmokeRouteError({
              cause,
              message: `Failed to read JSON from ${route}`,
              route,
            })
        )
      )
    ),
    Effect.flatMap((body) =>
      Schema.decodeUnknownEffect(schema)(body).pipe(
        Effect.mapError(
          (cause) =>
            new SmokeRouteError({
              cause,
              message: `Failed to decode JSON from ${route}`,
              route,
            })
        )
      )
    )
  );

const getRouteJson = <RouteSchema extends Schema.Top>(
  path: string,
  schema: RouteSchema
) => {
  const route = `GET ${path}`;

  return HttpClient.get(routeUrl(path), { acceptJson: true }).pipe(
    Effect.mapError(
      (cause) =>
        new SmokeRouteError({
          cause,
          message: `Failed to call ${route}`,
          route,
        })
    ),
    Effect.flatMap((response) => decodeRouteJson(route, response, schema))
  );
};

const postRouteJson = <RouteSchema extends Schema.Top>(
  path: string,
  body: unknown,
  schema: RouteSchema
) => {
  const route = `POST ${path}`;

  return HttpBody.json(body).pipe(
    Effect.mapError(
      (cause) =>
        new SmokeRouteError({
          cause,
          message: `Failed to encode JSON for ${route}`,
          route,
        })
    ),
    Effect.flatMap((httpBody) =>
      HttpClient.post(routeUrl(path), {
        acceptJson: true,
        body: httpBody,
        headers: { "content-type": "application/json" },
      })
    ),
    Effect.mapError(
      (cause) =>
        new SmokeRouteError({
          cause,
          message: `Failed to call ${route}`,
          route,
        })
    ),
    Effect.flatMap((response) => decodeRouteJson(route, response, schema))
  );
};

const calculateRequestBody = Schema.decodeUnknownEffect(CalculatorRunRequest)({
  facts: {
    grossPay: new GrossPay({
      amount: aud(346_200),
      period: "fortnightly",
    }),
    taxFreeThresholdClaimed: true,
  },
  jurisdiction: "AU",
  taxYear: "2025-26",
}).pipe(
  Effect.flatMap(Schema.encodeUnknownEffect(CalculatorRunRequest)),
  Effect.mapError(
    (cause) =>
      new SmokeRouteError({
        cause,
        message: "Failed to prepare the canonical calculate smoke payload",
        route: `POST /api/v1/calculators/${takeHomeCalculatorId}/calculate`,
      })
  )
);

const waitForHealth = getRouteJson("/api/health", Schema.Json).pipe(
  Effect.retry(
    Schedule.spaced("250 millis").pipe(Schedule.both(Schedule.recurs(40)))
  ),
  Effect.mapError(
    (cause) =>
      new SmokeRouteError({
        cause,
        message: `Timed out waiting for ${smokeOrigin}/api/health`,
        route: "GET /api/health",
      })
  )
);

const ApiProcess = ChildProcess.make("bun", ["src/index.ts"], {
  cwd: appRoot,
  env: {
    API_HOST: smokeHost,
    API_PORT: String(smokePort),
  },
  extendEnv: true,
  forceKillAfter: "2 seconds",
  killSignal: "SIGTERM",
  stderr: "inherit",
  stdin: "ignore",
  stdout: "inherit",
});

const SmokeProgram = Effect.gen(function* smokePublicRoutes() {
  const apiProcess = yield* ApiProcess;

  yield* Console.info(
    `Started apps/api smoke process on ${smokeOrigin} (pid ${apiProcess.pid})`
  );

  yield* waitForHealth;
  yield* Console.info("GET /api/health passed");

  const catalog = yield* getRouteJson(
    "/api/v1/calculators",
    CalculatorCatalogResponse
  );
  yield* Array.findFirst(
    catalog.calculators,
    (calculator) => calculator.calculatorId === takeHomeCalculatorId
  ).pipe(
    Option.match({
      onNone: () =>
        Effect.fail(
          new SmokeRouteError({
            message: `Calculator catalog did not include ${takeHomeCalculatorId}`,
            route: "GET /api/v1/calculators",
          })
        ),
      onSome: () => Console.info("GET /api/v1/calculators passed"),
    })
  );

  const payload = yield* calculateRequestBody;
  const calculation = yield* postRouteJson(
    `/api/v1/calculators/${takeHomeCalculatorId}/calculate`,
    payload,
    CalculatorRunResponse
  );

  yield* Match.value(calculation.calculator.calculatorId).pipe(
    Match.when(takeHomeCalculatorId, () =>
      Console.info(
        `POST /api/v1/calculators/${takeHomeCalculatorId}/calculate passed`
      )
    ),
    Match.orElse((calculatorId) =>
      Effect.fail(
        new SmokeRouteError({
          message: `Calculate response returned ${calculatorId}`,
          route: `POST /api/v1/calculators/${takeHomeCalculatorId}/calculate`,
        })
      )
    )
  );

  yield* getRouteJson("/api/docs/openapi.json", Schema.Json);
  yield* Console.info("GET /api/docs/openapi.json passed");
}).pipe(
  Effect.scoped,
  Effect.tap(() => Console.info("apps/api smoke process stopped"))
);

BunRuntime.runMain(
  SmokeProgram.pipe(
    Effect.provide(Layer.mergeAll(BunServices.layer, BunHttpClient.layer))
  )
);
