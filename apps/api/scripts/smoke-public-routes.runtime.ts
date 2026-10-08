import * as BunHttpClient from "@effect/platform-bun/BunHttpClient";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array,
  Config,
  Console,
  Effect,
  Layer,
  Match,
  Option,
  Schema,
  Stream,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ChildProcess } from "effect/process";

import {
  checkApiCalculation,
  checkApiCatalog,
  checkApiOpenApi,
  checkApiPublicContent,
  waitForApiHealth,
} from "./routes.js";
import {
  ApiSmokeArguments,
  ApiSmokeConsumerError,
  ApiSmokeConsumerEvidence,
  ApiSmokeConsumerManifest,
  ApiSmokeConsumerParameters,
  ApiSmokeSettings,
  ApiSmokeValidationError,
} from "./schemas.js";

// This string is the deliberately plain JavaScript consumer outside the repo.
// Its fetch/Promise/JSON behaviour proves consumption without TaxKit internals.
const externalConsumerScript = (
  parameters: string
) => `const { origin, takeHomeCalculatorId, annualTaxCalculatorId, simulateFailure } = ${parameters};

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
assert(
  calculation.report?.rulePackVersion === "rules-au-pay/1.0.0",
  "Calculate route returned the wrong pay ruleset version."
);

const annualTaxCalculation = await readJson(
  "POST",
  \`/api/v1/calculators/\${annualTaxCalculatorId}/calculate\`,
  {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      facts: {
        taxableIncome: {
          _tag: "Money",
          cents: 9_000_000,
          currency: "AUD",
        },
      },
      jurisdiction: "AU",
      taxYear: "2025-26",
    }),
  }
);
assert(
  annualTaxCalculation.report?._tag === "AnnualTaxReport",
  "Annual-tax calculate route returned the wrong report tag."
);
assert(
  annualTaxCalculation.report?.rulePackVersion ===
    "rules-au-income-tax/1.0.1",
  "Annual-tax calculate route returned the wrong ruleset version."
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

export const loadApiSmokeSettings = (args: readonly string[]) =>
  Effect.gen(function* () {
    const options = yield* Schema.decodeUnknownEffect(ApiSmokeArguments)(args);
    const port = yield* Config.schema(
      ApiSmokeSettings.fields.port,
      "TAXKIT_API_SMOKE_PORT"
    ).pipe(Config.withDefault(4173));
    return ApiSmokeSettings.make({
      port,
      simulateDownstreamFailure: Array.isReadonlyArrayNonEmpty(options),
    });
  }).pipe(
    Effect.mapError(
      () =>
        new ApiSmokeValidationError({
          message: "Invalid API smoke settings or arguments.",
        })
    )
  );

const runExternalConsumer = (workspacePath: string, origin: string) =>
  Effect.gen(function* () {
    yield* Console.info("$ bun run smoke");
    const result = yield* Effect.gen(function* () {
      const handle = yield* ChildProcess.make("bun", ["run", "smoke"], {
        cwd: workspacePath,
        extendEnv: true,
        forceKillAfter: "2 seconds",
        stderr: "pipe",
        stdin: "ignore",
        stdout: "pipe",
      });
      const [stdout, , exitCode] = yield* Effect.all(
        [
          handle.stdout.pipe(
            Stream.mapAccum(
              () => 0,
              (previous, chunk) => {
                const bytes = previous + chunk.byteLength;
                return [bytes, [{ bytes, chunk }]] as const;
              }
            ),
            Stream.mapEffect(({ bytes, chunk }) =>
              bytes > 1_048_576
                ? Effect.fail(
                    new ApiSmokeConsumerError({
                      exitCode: Option.none(),
                      reason: "output-limit",
                    })
                  )
                : Effect.succeed(chunk)
            ),
            Stream.decodeText,
            Stream.mkString
          ),
          Stream.runDrain(handle.stderr),
          handle.exitCode,
        ],
        { concurrency: "unbounded" }
      );
      return { exitCode, stdout };
    }).pipe(
      Effect.mapError((failure) =>
        Match.value(failure).pipe(
          Match.tag("ApiSmokeConsumerError", (error) => error),
          Match.orElse(
            () =>
              new ApiSmokeConsumerError({
                exitCode: Option.none(),
                reason: "start-or-read",
              })
          )
        )
      ),
      Effect.timeoutOrElse({
        duration: "30 seconds",
        orElse: () =>
          Effect.fail(
            new ApiSmokeConsumerError({
              exitCode: Option.none(),
              reason: "timeout",
            })
          ),
      })
    );

    if (result.exitCode !== 0) {
      return yield* Effect.fail(
        new ApiSmokeConsumerError({
          exitCode: Option.some(Number(result.exitCode)),
          reason: "exit",
        })
      );
    }
    const evidence = yield* Schema.decodeEffect(
      Schema.fromJsonString(ApiSmokeConsumerEvidence)
    )(result.stdout).pipe(
      Effect.mapError(
        () =>
          new ApiSmokeConsumerError({
            exitCode: Option.some(0),
            reason: "evidence",
          })
      )
    );
    const expectedRoutes = [
      "GET /api/health",
      "GET /api/v1/calculators",
      "POST /api/v1/calculators/au.pay.take-home/calculate",
      "POST /api/v1/calculators/au.income-tax.annual/calculate",
      "GET /api/docs/openapi.json",
    ];
    if (
      evidence.origin !== origin ||
      !Array.makeEquivalence<string>((a, b) => a === b)(
        evidence.routeEvidence,
        expectedRoutes
      )
    ) {
      return yield* Effect.fail(
        new ApiSmokeConsumerError({
          exitCode: Option.some(0),
          reason: "evidence",
        })
      );
    }
    yield* Console.info("External temp-workspace HTTP consumer passed");
  }).pipe(Effect.scoped);

export const checkApiPublicRoutes = (settings: typeof ApiSmokeSettings.Type) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const appRoot = yield* path.fromFileUrl(new URL("..", import.meta.url));
    const repoRoot = path.resolve(appRoot, "../..");
    const origin = `http://127.0.0.1:${settings.port}`;
    const apiProcess = yield* ChildProcess.make("bun", ["src/index.ts"], {
      cwd: appRoot,
      env: { API_HOST: "127.0.0.1", API_PORT: String(settings.port) },
      extendEnv: true,
      forceKillAfter: "2 seconds",
      killSignal: "SIGTERM",
      stderr: "inherit",
      stdin: "ignore",
      stdout: "inherit",
    }).pipe(
      Effect.mapError(
        () =>
          new ApiSmokeValidationError({
            message: "Failed to start the API smoke process.",
          })
      )
    );
    yield* Console.info(
      `Started apps/api smoke process on ${origin} (pid ${apiProcess.pid})`
    );
    yield* waitForApiHealth(origin);
    yield* Console.info("GET /api/health passed");
    yield* checkApiCatalog(origin);
    yield* Console.info("GET /api/v1/calculators passed");
    yield* checkApiCalculation(origin);
    yield* Console.info(
      "POST /api/v1/calculators/au.pay.take-home/calculate passed"
    );
    yield* checkApiOpenApi(origin);
    yield* Console.info("GET /api/docs/openapi.json passed");
    yield* checkApiPublicContent(origin);
    yield* Console.info(
      "Public documentation page, navigation, search and Markdown passed"
    );

    const workspacePath = yield* Effect.acquireRelease(
      fs.makeTempDirectory({ prefix: "taxkit-api-downstream-" }),
      (tempPath) =>
        fs.remove(tempPath, { force: true, recursive: true }).pipe(
          Effect.tap(() => Console.info(`Cleanup result: removed ${tempPath}`)),
          Effect.catchCause(() =>
            Effect.die(
              new ApiSmokeValidationError({
                message:
                  "Failed to remove the external HTTP consumer workspace.",
              })
            )
          )
        )
    );
    const relative = path.relative(repoRoot, workspacePath);
    if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
      return yield* Effect.fail(
        new ApiSmokeValidationError({
          message: "Temp workspace must be outside the repo.",
        })
      );
    }
    yield* Console.info(
      `Created external temp HTTP consumer workspace at ${workspacePath}`
    );
    const parameters = yield* Schema.encodeEffect(
      Schema.fromJsonString(ApiSmokeConsumerParameters)
    )({
      annualTaxCalculatorId: "au.income-tax.annual",
      origin,
      simulateFailure: settings.simulateDownstreamFailure,
      takeHomeCalculatorId: "au.pay.take-home",
    });
    const manifest = yield* Schema.encodeEffect(
      Schema.fromJsonString(ApiSmokeConsumerManifest, { space: 2 })
    )({
      name: "taxkit-api-downstream-consumer",
      private: true,
      scripts: { smoke: "bun consumer.mjs" },
      type: "module",
    });
    yield* Effect.all(
      [
        fs.writeFileString(
          path.join(workspacePath, "package.json"),
          `${manifest}\n`
        ),
        fs.writeFileString(
          path.join(workspacePath, "consumer.mjs"),
          externalConsumerScript(parameters)
        ),
      ],
      { concurrency: "unbounded" }
    );
    yield* runExternalConsumer(workspacePath, origin);
  }).pipe(
    Effect.mapError((failure) =>
      Match.value(failure).pipe(
        Match.tags({
          ApiSmokeConsumerError: (error) => error,
          ApiSmokeRouteError: (error) => error,
          ApiSmokeValidationError: (error) => error,
        }),
        Match.orElse(
          () =>
            new ApiSmokeValidationError({
              message: "Failed to prepare the external HTTP consumer.",
            })
        )
      )
    ),
    Effect.tapErrorTag("ApiSmokeValidationError", (error) =>
      Console.error(error.message)
    ),
    Effect.tapErrorTag("ApiSmokeConsumerError", (error) =>
      Console.error(
        `External HTTP consumer failed (${error.reason}; exitCode: ${Option.getOrElse(error.exitCode, () => "unavailable")}).`
      )
    ),
    Effect.scoped,
    Effect.ensuring(Console.info("apps/api smoke process stopped"))
  );

if (import.meta.main) {
  BunRuntime.runMain(
    loadApiSmokeSettings(Array.drop(process.argv, 2)).pipe(
      Effect.flatMap(checkApiPublicRoutes),
      Effect.provide(Layer.mergeAll(BunServices.layer, BunHttpClient.layer))
    )
  );
}
