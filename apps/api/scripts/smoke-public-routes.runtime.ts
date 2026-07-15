import { fileURLToPath } from "node:url";

import * as BunHttpClient from "@effect/platform-bun/BunHttpClient";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  CalculatorCatalogResponse,
  CalculatorRunRequest,
  CalculatorRunResponse,
} from "@taxkit/api-http";
import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
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
  Stream,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as HttpBody from "effect/unstable/http/HttpBody";
import * as HttpClient from "effect/unstable/http/HttpClient";
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";
import { ChildProcess } from "effect/unstable/process";

const smokeHost = "127.0.0.1";
const smokePort = 4173;
const smokeOrigin = `http://${smokeHost}:${smokePort}`;
const takeHomeCalculatorId = "au.pay.take-home";
const appRootUrl = new URL("..", import.meta.url);
const repoRootUrl = new URL("../..", appRootUrl);
const appRoot = fileURLToPath(appRootUrl);
const repoRoot = fileURLToPath(repoRootUrl);
const simulateDownstreamFailure = Array.contains(
  process.argv,
  "--simulate-downstream-failure"
);

interface DownstreamConsumerCommandResult {
  readonly commandLine: string;
  readonly cwd: string;
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

class SmokeRouteError extends Data.TaggedError("SmokeRouteError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly route: string;
  readonly status?: number;
}> {}

class DownstreamConsumerError extends Data.TaggedError(
  "DownstreamConsumerError"
)<{
  readonly message: string;
  readonly result?: DownstreamConsumerCommandResult;
}> {}

const routeUrl = (path: string) => new URL(path, smokeOrigin).toString();

const externalConsumerScript = (
  simulateFailure: boolean
) => `const origin = ${JSON.stringify(smokeOrigin)};
const takeHomeCalculatorId = ${JSON.stringify(takeHomeCalculatorId)};
const simulateFailure = ${JSON.stringify(simulateFailure)};

const routeEvidence = [];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readJson = async (method, path, init = {}) => {
  const response = await fetch(new URL(path, origin), {
    method,
    headers: init.headers,
    body: init.body,
  });

  if (!response.ok) {
    throw new Error(\`\${method} \${path} returned \${response.status}\`);
  }

  routeEvidence.push(\`\${method} \${path}\`);
  return await response.json();
};

const health = await readJson("GET", "/api/health");
assert(health.status === "ok", "Health route did not return ok status.");

const catalog = await readJson("GET", "/api/v1/calculators");
assert(
  Array.isArray(catalog.calculators) &&
    catalog.calculators.some(
      (calculator) => calculator.calculatorId === takeHomeCalculatorId
    ),
  \`Calculator catalog did not include \${takeHomeCalculatorId}.\`
);

const calculation = await readJson(
  "POST",
  \`/api/v1/calculators/\${takeHomeCalculatorId}/calculate\`,
  {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      facts: {
        grossPay: {
          _tag: "GrossPay",
          amount: {
            _tag: "Money",
            cents: 346_200,
            currency: "AUD",
          },
          period: "fortnightly",
        },
        taxFreeThresholdClaimed: true,
      },
      jurisdiction: "AU",
      taxYear: "2025-26",
    }),
  }
);
assert(
  calculation.calculator?.calculatorId === takeHomeCalculatorId,
  "Calculate route returned the wrong calculator id."
);
assert(
  calculation.report?._tag === "TakeHomePayReport",
  "Calculate route returned the wrong report tag."
);

const openApi = await readJson("GET", "/api/docs/openapi.json");
assert(openApi.openapi, "OpenAPI route did not return an OpenAPI document.");
assert(
  openApi.paths?.["/api/v1/calculators/{calculatorId}/calculate"],
  "OpenAPI document did not include the calculate route."
);

console.log(
  JSON.stringify(
    {
      origin,
      routeEvidence,
    },
    null,
    2
  )
);

if (simulateFailure) {
  console.error("Intentional downstream consumer failure after route coverage.");
  process.exitCode = 1;
}
`;

const writeExternalConsumerWorkspace = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  workspacePath: string,
  simulateFailure: boolean
) =>
  Effect.all(
    [
      fs.writeFileString(
        path.join(workspacePath, "package.json"),
        `${JSON.stringify(
          {
            name: "taxkit-api-downstream-consumer",
            private: true,
            scripts: {
              smoke: "bun consumer.mjs",
            },
            type: "module",
          },
          null,
          2
        )}\n`
      ),
      fs.writeFileString(
        path.join(workspacePath, "consumer.mjs"),
        externalConsumerScript(simulateFailure)
      ),
    ],
    { concurrency: "unbounded" }
  );

const validateWorkspaceLocation = (
  path: Path.Path,
  repoRootPath: string,
  workspacePath: string
) => {
  const relativeToRepo = path.relative(repoRootPath, workspacePath);

  return Match.value(
    !relativeToRepo.startsWith("..") && !path.isAbsolute(relativeToRepo)
  ).pipe(
    Match.when(true, () =>
      Effect.fail(
        new DownstreamConsumerError({
          message: `Temp workspace must be outside the repo: ${workspacePath}`,
        })
      )
    ),
    Match.orElse(() => Effect.succeed(workspacePath))
  );
};

const runExternalConsumer = (workspacePath: string) =>
  Effect.gen(function* runExternalConsumerCommand() {
    const command = "bun";
    const args = ["run", "smoke"] as const;
    const commandLine = Array.prepend(args, command).join(" ");

    yield* Console.info(`$ ${commandLine}`);

    const result = yield* Effect.gen(function* runChildProcess() {
      const handle = yield* ChildProcess.make(command, args, {
        cwd: workspacePath,
        extendEnv: true,
        forceKillAfter: "2 seconds",
        stderr: "pipe",
        stdin: "ignore",
        stdout: "pipe",
      });
      const [stdout, stderr, exitCode] = yield* Effect.all(
        [
          Stream.mkString(Stream.decodeText(handle.stdout)),
          Stream.mkString(Stream.decodeText(handle.stderr)),
          handle.exitCode,
        ],
        { concurrency: "unbounded" }
      );

      return {
        commandLine,
        cwd: workspacePath,
        exitCode: Number(exitCode),
        stderr,
        stdout,
      } satisfies DownstreamConsumerCommandResult;
    }).pipe(
      Effect.mapError(
        (cause) =>
          new DownstreamConsumerError({
            message: `Failed to run external temp-workspace HTTP consumer: ${String(cause)}`,
          })
      )
    );

    return yield* Match.value(result.exitCode).pipe(
      Match.when(0, () =>
        Effect.gen(function* externalConsumerPassed() {
          const output = result.stdout.trim();
          yield* Match.value(output.length).pipe(
            Match.when(0, () => Effect.void),
            Match.orElse(() => Console.info(output))
          );
          yield* Console.info("External temp-workspace HTTP consumer passed");

          return result;
        })
      ),
      Match.orElse(() =>
        Effect.fail(
          new DownstreamConsumerError({
            message: "External temp-workspace HTTP consumer failed.",
            result,
          })
        )
      )
    );
  });

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
    Schedule.max([Schedule.spaced("250 millis"), Schedule.recurs(40)])
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
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
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

  const workspacePath = yield* Effect.acquireRelease(
    fs.makeTempDirectory({
      prefix: "taxkit-api-downstream-",
    }),
    (tempPath) =>
      fs.remove(tempPath, { force: true, recursive: true }).pipe(
        Effect.tap(() => Console.info(`Cleanup result: removed ${tempPath}`)),
        Effect.catchCause((cause) =>
          Console.error(
            `Cleanup result: failed to remove ${tempPath}: ${String(cause)}`
          )
        )
      )
  );

  yield* validateWorkspaceLocation(path, repoRoot, workspacePath);
  yield* Console.info(
    `Created external temp HTTP consumer workspace at ${workspacePath}`
  );
  yield* writeExternalConsumerWorkspace(
    fs,
    path,
    workspacePath,
    simulateDownstreamFailure
  );
  yield* runExternalConsumer(workspacePath);
}).pipe(
  Effect.scoped,
  Effect.ensuring(Console.info("apps/api smoke process stopped")),
  Effect.catchTag("DownstreamConsumerError", (error) =>
    Console.error(
      [
        error.message,
        Option.fromNullishOr(error.result).pipe(
          Option.match({
            onNone: () => "",
            onSome: (result) =>
              [
                `Command failed: ${result.commandLine}`,
                `cwd: ${result.cwd}`,
                `exitCode: ${result.exitCode}`,
                result.stdout,
                result.stderr,
              ].join("\n"),
          })
        ),
      ].join("\n")
    ).pipe(
      Effect.flatMap(() =>
        Effect.sync(() => {
          process.exitCode = 1;
        })
      )
    )
  )
);

BunRuntime.runMain(
  SmokeProgram.pipe(
    Effect.provide(Layer.mergeAll(BunServices.layer, BunHttpClient.layer))
  )
);
