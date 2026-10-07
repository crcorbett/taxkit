import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import {
  Array,
  Config,
  Effect,
  FileSystem,
  Option,
  Path,
  Queue,
  Ref,
  Record,
  Schedule,
  Schema,
  Stream,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { chromium } from "playwright";

const LocalOrigin = Schema.String.check(
  Schema.isPattern(/^http:\/\/localhost:[1-9][0-9]{3,4}$/u)
);
const LocalResource = Schema.fromJsonString(
  Schema.Struct({
    props: Schema.Struct({
      observability: Schema.Struct({
        enabled: Schema.Literal(false),
        headSamplingRate: Schema.Literal(0),
        logs: Schema.Struct({
          enabled: Schema.Literal(false),
          headSamplingRate: Schema.Literal(0),
          invocationLogs: Schema.Literal(false),
          persist: Schema.Literal(false),
        }),
        traces: Schema.Struct({
          enabled: Schema.Literal(false),
          headSamplingRate: Schema.Literal(0),
          persist: Schema.Literal(false),
        }),
      }),
    }),
    providerMode: Schema.Literal("local"),
  })
);

describe("native local development", () => {
  it.live(
    "starts the real pair, reloads both sources and stops its processes",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
        const root = path.resolve("../..");
        const auth = yield* fs.makeTempDirectoryScoped({
          prefix: "taxkit-native-dev-auth-",
        });
        const environment = {
          ALCHEMY_HOME: auth,
          ALCHEMY_TELEMETRY_DISABLED: "1",
          BUN_OPTIONS: "--conditions=source --no-env-file",
          // Exercise the non-polling watcher used on the Linux CI runner.
          CHOKIDAR_USEPOLLING: "0",
          CI: "1",
          HOME: yield* Config.schema(Schema.String, "HOME"),
          NO_COLOR: "1",
          PATH: yield* Config.schema(Schema.String, "PATH"),
        };
        const output = yield* Ref.make("");
        const browser = yield* Effect.acquireRelease(
          Effect.promise(() => chromium.launch({ headless: true })),
          (value) => Effect.promise(() => value.close())
        );
        const page = yield* Effect.promise(() => browser.newPage());
        const calls = yield* Queue.make<string>();
        const exceptions = yield* Queue.make<string>();
        page.on("request", (request) => {
          if (new URL(request.url()).pathname === "/rpc") {
            Queue.offerUnsafe(calls, request.url());
          }
        });
        page.on("pageerror", (error) => {
          Queue.offerUnsafe(exceptions, error.message);
        });
        const origins = yield* Effect.gen(function* () {
          const child = yield* spawner.spawn(
            ChildProcess.make(
              "bun",
              [
                "run",
                "node_modules/alchemy/bin/cli.js",
                "dev",
                "--config",
                "alchemy.apps.local.run.ts",
                "--env-file",
                "tools/apps-local/no-local-env",
                "--stage",
                "dev_native_apps_proof",
              ],
              {
                cwd: root,
                env: environment,
                extendEnv: false,
                forceKillAfter: "5 seconds",
                killSignal: "SIGINT",
                stderr: "pipe",
                stdin: "ignore",
                stdout: "pipe",
              }
            )
          );
          yield* child.all.pipe(
            Stream.decodeText,
            Stream.runForEach((chunk) =>
              Ref.update(output, (previous) => previous + chunk)
            ),
            Effect.forkScoped
          );
          const addresses = yield* Ref.get(output).pipe(
            Effect.repeat({
              schedule: Schedule.spaced("100 millis"),
              while: (text) =>
                !text.includes("apiUrl:") || !text.includes("websiteUrl:"),
            }),
            Effect.timeout("35 seconds")
          );
          const apiAddress = yield* Schema.decodeUnknownEffect(
            Schema.Struct({ origin: LocalOrigin })
          )(
            Option.getOrUndefined(
              Array.last([...addresses.matchAll(/apiUrl: '(?<origin>.*?)'/gu)])
            )?.groups
          );
          const websiteAddress = yield* Schema.decodeUnknownEffect(
            Schema.Struct({ origin: LocalOrigin })
          )(
            Option.getOrUndefined(
              Array.last([
                ...addresses.matchAll(/websiteUrl: '(?<origin>.*?)'/gu),
              ])
            )?.groups
          );
          const apiOrigin = apiAddress.origin;
          const websiteOrigin = websiteAddress.origin;
          const health = yield* Effect.promise(() =>
            page.request.get(`${apiOrigin}/api/health`)
          );
          expect(health.status()).toBe(200);
          // A printed local address proves listening, not a served page. Give
          // only gateway-unavailable startup responses a bounded readiness
          // window; application errors and the real navigation still fail.
          const websiteReady = yield* Effect.promise(() =>
            page.request.get(websiteOrigin, { timeout: 5000 })
          ).pipe(
            Effect.map((response) => response.status()),
            Effect.repeat({
              schedule: Schedule.spaced("100 millis"),
              while: (status) => status === 502 || status === 503,
            }),
            Effect.timeout("15 seconds")
          );
          expect(websiteReady).toBe(200);
          const initial = yield* Effect.promise(() => page.goto(websiteOrigin));
          expect(initial?.status()).toBe(200);
          yield* Effect.promise(() =>
            page
              .getByRole("heading", {
                exact: true,
                name: "Australian take-home pay",
              })
              .waitFor({ timeout: 15_000 })
          );
          yield* Effect.promise(() => page.waitForLoadState("networkidle"));
          const payInput = page.getByLabel("Pay before tax ($)");
          yield* Effect.promise(() => payInput.fill("invalid"));
          yield* Effect.promise(() =>
            page.getByRole("button", { exact: true, name: "Calculate" }).click()
          );
          yield* Effect.promise(() =>
            page
              .getByText("Enter a valid pay amount and pay period.", {
                exact: true,
              })
              .waitFor({ timeout: 10_000 })
          );
          yield* Effect.promise(() => payInput.fill("1654"));
          yield* Effect.promise(() =>
            page.getByRole("alert").waitFor({ state: "hidden", timeout: 5000 })
          );
          const viewPath = path.join(
            root,
            "apps/web/src/lib/take-home.view.tsx"
          );
          const originalView = yield* fs.readFileString(viewPath);
          expect(originalView).toContain("<h2>Australian take-home pay</h2>");
          // The client-only validation above proves hydration before a source
          // change; changing source during hydration can create false errors.
          yield* Effect.gen(function* () {
            yield* Effect.addFinalizer(() =>
              fs.writeFileString(viewPath, originalView).pipe(Effect.orDie)
            );
            yield* fs.writeFileString(
              viewPath,
              originalView.replace(
                "<h2>Australian take-home pay</h2>",
                "<h2>Local development proof</h2>"
              )
            );
            yield* Effect.promise(() =>
              page
                .getByRole("heading", {
                  exact: true,
                  name: "Local development proof",
                })
                .waitFor({ timeout: 15_000 })
            );
            // Vite's pinned watcher drops repeat change events within 50 ms.
            // Keep the two observed saves separate before exact restoration.
            yield* Effect.sleep("100 millis");
          }).pipe(Effect.scoped);
          expect(yield* fs.readFileString(viewPath)).toBe(originalView);
          yield* Effect.promise(() =>
            page
              .getByRole("heading", {
                exact: true,
                name: "Australian take-home pay",
              })
              .waitFor({ timeout: 15_000 })
          );
          expect(yield* Queue.clear(calls)).toEqual([]);
          yield* Effect.promise(() =>
            page.getByRole("button", { exact: true, name: "Calculate" }).click()
          );
          yield* Effect.promise(() =>
            page
              .getByText("$1,301.00", { exact: true })
              .waitFor({ timeout: 10_000 })
          );
          expect(yield* Queue.clear(calls)).toEqual([`${apiOrigin}/rpc`]);
          const plainContext = yield* Effect.acquireRelease(
            Effect.promise(() =>
              browser.newContext({ javaScriptEnabled: false })
            ),
            (value) => Effect.promise(() => value.close())
          );
          const plainPage = yield* Effect.promise(() => plainContext.newPage());
          yield* Effect.promise(() => plainPage.goto(websiteOrigin));
          yield* Effect.promise(() =>
            plainPage
              .getByRole("button", { exact: true, name: "Calculate" })
              .click()
          );
          yield* Effect.promise(() =>
            plainPage
              .getByText("$1,301.00", { exact: true })
              .waitFor({ timeout: 10_000 })
          );
          const workerPath = path.join(root, "apps/api/src/worker.ts");
          const originalWorker = yield* fs.readFileString(workerPath);
          // Local development runs the native entry point. Alter that actual
          // composition so a passing reload proves the served Worker changed.
          const init =
            "export const ApiWorkerNativeInit = ApiWorkerApplication.pipe(";
          expect(originalWorker).toContain(init);
          yield* Effect.gen(function* () {
            yield* Effect.addFinalizer(() =>
              fs.writeFileString(workerPath, originalWorker).pipe(Effect.orDie)
            );
            yield* fs.writeFileString(
              workerPath,
              originalWorker
                .replace(
                  'import { Effect, Layer } from "effect";',
                  'import { Effect, Layer } from "effect";\nimport { HttpServerResponse } from "effect/http";'
                )
                .replace(
                  init,
                  `${init}\n  Effect.map((application) => ({ ...application, fetch: application.fetch.pipe(Effect.map((response) => HttpServerResponse.setHeader(response, "x-local-proof", "PRIVATE9"))) })),`
                )
            );
            yield* Effect.promise(() =>
              page.request.get(`${apiOrigin}/api/health`)
            ).pipe(
              Effect.map(
                (response) =>
                  response.status() === 200 &&
                  Option.getOrUndefined(
                    Record.get(response.headers(), "x-local-proof")
                  ) === "PRIVATE9"
              ),
              Effect.catchDefect(() => Effect.succeed(false)),
              Effect.repeat({
                schedule: Schedule.spaced("100 millis"),
                while: (observed) => !observed,
              }),
              Effect.timeout("15 seconds")
            );
          }).pipe(Effect.scoped);
          expect(yield* fs.readFileString(workerPath)).toBe(originalWorker);
          yield* Effect.promise(() =>
            page.request.get(`${apiOrigin}/api/health`)
          ).pipe(
            Effect.map(
              (response) =>
                response.status() === 200 &&
                Option.isNone(Record.get(response.headers(), "x-local-proof"))
            ),
            Effect.catchDefect(() => Effect.succeed(false)),
            Effect.repeat({
              schedule: Schedule.spaced("100 millis"),
              while: (observed) => !observed,
            }),
            Effect.timeout("15 seconds")
          );
          yield* Effect.forEach(["TaxKitApi", "TaxKitWebsite"], (resource) =>
            fs
              .readFileString(
                path.join(
                  root,
                  ".alchemy/state/TaxKitAppsLocal/dev_native_apps_proof",
                  `${resource}.json`
                )
              )
              .pipe(Effect.flatMap(Schema.decodeUnknownEffect(LocalResource)))
          );
          const apiState = yield* fs.readFileString(
            path.join(
              root,
              ".alchemy/state/TaxKitAppsLocal/dev_native_apps_proof/TaxKitApi.json"
            )
          );
          expect(apiState).toContain("/apps/api/src/worker.ts");
          expect(yield* fs.readDirectory(auth)).toEqual(["logs", "profiles"]);
          expect(
            yield* fs.glob("**/*", { root: path.join(auth, "profiles") })
          ).toEqual(["default"]);
          expect(yield* Queue.clear(exceptions)).toEqual([]);
          expect(yield* Queue.clear(calls)).toEqual([]);
          return { apiOrigin, websiteOrigin };
        }).pipe(Effect.scoped);
        yield* Effect.forEach(
          [origins.apiOrigin, origins.websiteOrigin],
          (origin) =>
            Effect.promise(() =>
              page.request.get(origin, { timeout: 1000 })
            ).pipe(
              Effect.map(() => false),
              Effect.catchDefect((error) =>
                Schema.decodeUnknownEffect(
                  Schema.Struct({ message: Schema.String })
                )(error).pipe(
                  Effect.map((failure) =>
                    failure.message.includes("ECONNREFUSED")
                  )
                )
              ),
              Effect.repeat({
                schedule: Schedule.spaced("100 millis"),
                while: (stopped) => !stopped,
              }),
              Effect.timeout("10 seconds")
            )
        );
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
    90_000
  );
  it.live(
    "rejects planning and an unadmitted development stage before declaring resources",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
        const root = path.resolve("../..");
        const auth = yield* fs.makeTempDirectoryScoped({
          prefix: "taxkit-native-dev-rejection-",
        });
        const environment = {
          ALCHEMY_HOME: auth,
          ALCHEMY_TELEMETRY_DISABLED: "1",
          BUN_OPTIONS: "--conditions=source --no-env-file",
          CI: "1",
          HOME: yield* Config.schema(Schema.String, "HOME"),
          NO_COLOR: "1",
          PATH: yield* Config.schema(Schema.String, "PATH"),
        };
        yield* Effect.forEach(
          [
            { command: "plan", stage: "dev_native_apps_proof" },
            { command: "dev", stage: "dev_native_apps_rejected" },
          ],
          (attempt) =>
            Effect.gen(function* () {
              const child = yield* spawner.spawn(
                ChildProcess.make(
                  "bun",
                  [
                    "run",
                    "node_modules/alchemy/bin/cli.js",
                    attempt.command,
                    "--config",
                    "alchemy.apps.local.run.ts",
                    "--env-file",
                    "tools/apps-local/no-local-env",
                    "--stage",
                    attempt.stage,
                  ],
                  {
                    cwd: root,
                    env: environment,
                    extendEnv: false,
                    forceKillAfter: "3 seconds",
                    killSignal: "SIGINT",
                    stderr: "pipe",
                    stdin: "ignore",
                    stdout: "pipe",
                  }
                )
              );
              const captured = yield* Ref.make("");
              yield* child.all.pipe(
                Stream.decodeText,
                Stream.runForEach((chunk) =>
                  Ref.update(captured, (previous) => previous + chunk)
                ),
                Effect.forkScoped
              );
              const text = yield* Ref.get(captured).pipe(
                Effect.repeat({
                  schedule: Schedule.spaced("100 millis"),
                  while: (value) =>
                    !value.includes(
                      "Native local apps require alchemy dev at stage dev_native_apps"
                    ),
                })
              );
              expect(text).not.toContain("[TaxKitApi]");
              expect(text).not.toContain("[TaxKitWebsite]");
              if (attempt.command === "plan") {
                expect(yield* child.exitCode).not.toBe(0);
              } else {
                // Native dev keeps its file watcher alive after a failed import.
                // The root rejects declaration; this scope still owns shutdown.
                expect(
                  yield* fs.exists(
                    path.join(
                      root,
                      ".alchemy/state/TaxKitAppsLocal",
                      attempt.stage,
                      "__stack_output__.json"
                    )
                  )
                ).toBe(false);
              }
            }).pipe(Effect.timeout("15 seconds"), Effect.scoped)
        );
        expect(yield* fs.glob("**/*.json", { root: auth })).toEqual([]);
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
    40_000
  );
});
