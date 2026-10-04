import { createRequire } from "node:module";

import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import type { PlatformError } from "effect";
import {
  Array,
  Clock,
  Config,
  Crypto,
  Effect,
  Fiber,
  FileSystem,
  HashSet,
  Layer,
  Match,
  Option,
  Order,
  Path,
  Record,
  Ref,
  Schema,
  Stream,
} from "effect";
import { Hex } from "effect/encoding";
import { Headers, HttpClient, HttpServer } from "effect/http";
import type { HttpClientResponse } from "effect/http/HttpClientResponse";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { verifyBuiltBrowser } from "./cloudflare-built-browser.live.js";
import type { BuiltProofOperation } from "./cloudflare-built-proof.boundary.js";
import {
  BuiltBrowserInput,
  BuiltProofCandidate,
  BuiltProofError,
  BuiltProofReceipt,
  LocalCloudflareBuiltProof,
} from "./cloudflare-built-proof.boundary.js";
import { HostedProofSha256 } from "./cloudflare-hosted-proof.boundary.js";

const knownPath = "/guides/calculate-australian-take-home-pay";
const missingPath = "/__docs-evidence__/missing";
const runtimeHeaders = { "x-taxkit-docs-runtime-proof": "construction-count" };
const failure = (operation: typeof BuiltProofOperation.Type) =>
  new BuiltProofError({ operation, reason: "start-or-read" });
const requireProof = (
  passes: boolean,
  operation: typeof BuiltProofOperation.Type
) =>
  passes
    ? Effect.void
    : Effect.fail(new BuiltProofError({ operation, reason: "invariant" }));

const ProcessId = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(
  Schema.fromBrand("ProcessId", ChildProcessSpawner.ProcessId)
);
const ProcessEntry = Schema.Struct({
  command: Schema.NonEmptyString,
  parentPid: ProcessId,
  pid: ProcessId.check(Schema.isGreaterThan(0)),
  state: Schema.NonEmptyString,
});
const DependencyManifest = Schema.Struct({ version: Schema.NonEmptyString });
const UnknownRecord = Schema.Record(Schema.String, Schema.Unknown);
const GeneratedAssets = Schema.StructWithRest(
  Schema.Struct({ directory: Schema.Literal("../client") }),
  [UnknownRecord]
).check(Schema.makeFilter((value) => Record.keys(value).length === 1));
const GeneratedConfig = Schema.StructWithRest(
  Schema.Struct({
    assets: GeneratedAssets,
    compatibility_date: Schema.Literal("2026-06-24"),
    compatibility_flags: Schema.Tuple([Schema.Literal("nodejs_compat")]),
    d1_databases: Schema.Tuple([]),
    kv_namespaces: Schema.Tuple([]),
    main: Schema.Literal("index.js"),
    no_bundle: Schema.Literal(true),
    queues: Schema.StructWithRest(
      Schema.Struct({
        consumers: Schema.Tuple([]),
        producers: Schema.Tuple([]),
      }),
      [UnknownRecord]
    ).check(Schema.makeFilter((value) => Record.keys(value).length === 2)),
    r2_buckets: Schema.Tuple([]),
    services: Schema.Tuple([]),
    vars: Schema.Record(Schema.String, Schema.Never),
  }),
  [UnknownRecord]
);

// Only these existing host inputs can reach either local process or Chromium.
// Config owns acquisition; provider credentials are never acquired or copied.
const LocalEnvironment = Schema.Struct({
  CI: Schema.OptionFromOptional(Schema.String),
  COLORTERM: Schema.OptionFromOptional(Schema.String),
  LANG: Schema.OptionFromOptional(Schema.String),
  LC_ALL: Schema.OptionFromOptional(Schema.String),
  NO_COLOR: Schema.OptionFromOptional(Schema.String),
  PATH: Schema.NonEmptyString,
  PLAYWRIGHT_BROWSERS_PATH: Schema.OptionFromOptional(Schema.String),
  TERM: Schema.OptionFromOptional(Schema.String),
  TMPDIR: Schema.OptionFromOptional(Schema.String),
  TZ: Schema.OptionFromOptional(Schema.String),
});

// Bounded stream collection is an I/O owner reused by finite commands and the
// long-running Worker. Both pipes drain concurrently with process exit.
export const readBuiltProofOutput = (
  output: Stream.Stream<Uint8Array, PlatformError.PlatformError>,
  operation: typeof BuiltProofOperation.Type
) =>
  output.pipe(
    Stream.mapAccum(
      () => 0,
      (previous, bytes) =>
        [
          previous + bytes.byteLength,
          [{ bytes, total: previous + bytes.byteLength }],
        ] as const
    ),
    Stream.mapEffect(({ total, bytes }) =>
      total > 1_048_576
        ? Effect.fail(
            new BuiltProofError({ operation, reason: "output-limit" })
          )
        : Effect.succeed(bytes)
    ),
    Stream.decodeText,
    Stream.mkString,
    Effect.mapError((error) =>
      Match.value(error).pipe(
        Match.tag("BuiltProofError", (value) => value),
        Match.orElse(() => failure(operation))
      )
    )
  );

const runCommand = Effect.fnUntraced(function* (
  operation: typeof BuiltProofOperation.Type,
  executable: string,
  arguments_: readonly string[],
  cwd: string,
  environment: Readonly<Record<string, string>>
) {
  const handle = yield* ChildProcess.make(executable, arguments_, {
    cwd,
    env: environment,
    extendEnv: false,
    forceKillAfter: "5 seconds",
    stderr: "pipe",
    stdin: "ignore",
    stdout: "pipe",
  });
  const [stdout, stderr, exit] = yield* Effect.all(
    [
      readBuiltProofOutput(handle.stdout, operation),
      readBuiltProofOutput(handle.stderr, operation),
      handle.exitCode,
    ],
    { concurrency: 3 }
  );
  if (Number(exit) !== 0) {
    return yield* new BuiltProofError({ operation, reason: "exit" });
  }
  return `${stdout}\n${stderr}`;
}, Effect.scoped);

const readProcessTable = Effect.fnUntraced(function* (
  repositoryRoot: string,
  environment: Readonly<Record<string, string>>
) {
  const output = yield* runCommand(
    "process-table",
    "/bin/ps",
    ["-ax", "-o", "pid=,ppid=,stat=,command="],
    repositoryRoot,
    environment
  );
  return yield* Effect.forEach(
    Array.filter(output.split("\n"), (line) => line.trim().length > 0),
    (line) =>
      Option.fromNullishOr(
        /^\s*(?<pid>\d+)\s+(?<parentPid>\d+)\s+(?<state>\S+)\s+(?<command>.+)$/u.exec(
          line
        )?.groups
      ).pipe(
        Effect.fromOption,
        Effect.flatMap((groups) =>
          Effect.gen(function* () {
            const pid = yield* Record.get(groups, "pid").pipe(
              Effect.fromOption
            );
            const parentPid = yield* Record.get(groups, "parentPid").pipe(
              Effect.fromOption
            );
            const command = yield* Record.get(groups, "command").pipe(
              Effect.fromOption
            );
            const state = yield* Record.get(groups, "state").pipe(
              Effect.fromOption
            );
            return yield* Schema.decodeEffect(ProcessEntry)({
              command,
              parentPid: Number(parentPid),
              pid: Number(pid),
              state,
            });
          })
        ),
        Effect.mapError(() => failure("process-table"))
      )
  );
});

const descendants = (
  entries: readonly (typeof ProcessEntry.Type)[],
  rootPid: ChildProcessSpawner.ProcessId
) => {
  const visit = (
    parents: HashSet.HashSet<ChildProcessSpawner.ProcessId>,
    seen: HashSet.HashSet<ChildProcessSpawner.ProcessId>,
    found: readonly (typeof ProcessEntry.Type)[]
  ): readonly (typeof ProcessEntry.Type)[] => {
    const children = Array.filter(
      entries,
      (entry) =>
        HashSet.has(parents, entry.parentPid) && !HashSet.has(seen, entry.pid)
    );
    if (children.length === 0) {
      return found;
    }
    const next = HashSet.fromIterable(
      Array.map(children, (entry) => entry.pid)
    );
    return visit(
      next,
      HashSet.union(seen, next),
      Array.appendAll(found, children)
    );
  };
  const initial = HashSet.make(rootPid);
  return visit(initial, initial, []);
};

const waitForDescendantExit = Effect.fnUntraced(function* (
  observed: readonly (typeof ProcessEntry.Type)[],
  repositoryRoot: string,
  environment: Readonly<Record<string, string>>,
  attempts: number
): Effect.fn.Return<
  readonly (typeof ProcessEntry.Type)[],
  BuiltProofError | PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner
> {
  const entries = yield* readProcessTable(repositoryRoot, environment);
  const remaining = Array.filter(
    entries,
    (entry) =>
      !entry.state.startsWith("Z") &&
      Array.some(
        observed,
        (child) => child.pid === entry.pid && child.command === entry.command
      )
  );
  if (remaining.length === 0 || attempts === 0) {
    return remaining;
  }
  yield* Effect.sleep(100);
  return yield* waitForDescendantExit(
    observed,
    repositoryRoot,
    environment,
    attempts - 1
  );
});

// Binary artifact reading has a separate finite bound from command output.
// Streaming enforces it before collection and closes the native file handle.
const readArtifactBytes = Effect.fnUntraced(function* (
  file: string,
  operation: typeof BuiltProofOperation.Type
) {
  const fs = yield* FileSystem.FileSystem;
  const chunks = yield* fs.stream(file).pipe(
    Stream.mapAccum(
      () => 0,
      (previous, bytes) =>
        [
          previous + bytes.byteLength,
          [{ bytes, total: previous + bytes.byteLength }],
        ] as const
    ),
    Stream.mapEffect(({ total, bytes }) =>
      total > 67_108_864
        ? Effect.fail(
            new BuiltProofError({ operation, reason: "output-limit" })
          )
        : Effect.succeed(bytes)
    ),
    Stream.runCollect,
    Effect.mapError((error) =>
      Match.value(error).pipe(
        Match.tag("BuiltProofError", (value) => value),
        Match.orElse(() => failure(operation))
      )
    )
  );
  return Buffer.concat(chunks);
});

// Preserve the existing sorted path/NUL/content/NUL digest bytes. Native
// Crypto receives one bounded immutable concatenation, with no mutable hash.
export const digestBuiltProofDirectory = Effect.fnUntraced(function* (
  directory: string,
  omitReadme: boolean
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const crypto = yield* Crypto.Crypto;
  const files = yield* fs.glob("**/*", { root: directory });
  yield* requireProof(files.length <= 10_000, "digest");
  const collectedBytes = yield* Ref.make(0);
  const entries = yield* Effect.forEach(
    Array.sort(
      Array.filter(files, (file) => !omitReadme || file !== "README.md"),
      Order.String
    ),
    (file) =>
      Effect.gen(function* () {
        const fullPath = path.join(directory, file);
        const info = yield* fs.stat(fullPath);
        if (info.type !== "File") {
          return [] as const;
        }
        yield* requireProof(Number(info.size) <= 67_108_864, "digest");
        const bytes = yield* readArtifactBytes(fullPath, "digest");
        yield* requireProof(
          (yield* Ref.updateAndGet(
            collectedBytes,
            (total) =>
              total +
              new TextEncoder().encode(file).byteLength +
              bytes.byteLength +
              2
          )) <= 67_108_864,
          "digest"
        );
        return [
          new TextEncoder().encode(file),
          new Uint8Array([0]),
          bytes,
          new Uint8Array([0]),
        ] as const;
      })
  );
  const pieces = Array.flatten(entries);
  yield* requireProof(
    Array.reduce(pieces, 0, (total, bytes) => total + bytes.byteLength) <=
      67_108_864,
    "digest"
  );
  return yield* crypto
    .digest("SHA-256", Buffer.concat(pieces))
    .pipe(Effect.map(Hex.encode), Effect.flatMap(HostedProofSha256.makeEffect));
});

// Generated output inspection owns its file limits and build-only filesystem policy.
const inspectBuiltArtifacts = Effect.fnUntraced(function* (
  builtRoot: string,
  repositoryRoot: string
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const serverRoot = path.join(builtRoot, "server");
  const generatedConfig = yield* readArtifactBytes(
    path.join(serverRoot, "wrangler.json"),
    "configuration"
  ).pipe(
    Effect.map((bytes) => new TextDecoder().decode(bytes)),
    Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(GeneratedConfig))),
    Effect.mapError(() => failure("configuration"))
  );
  const serverFiles = yield* fs.glob("**/*.{js,mjs,wasm,txt,html,sql,bin}", {
    root: serverRoot,
  });
  yield* requireProof(serverFiles.length <= 10_000, "filesystem");
  const serverSizes = yield* Effect.forEach(serverFiles, (file) =>
    fs
      .stat(path.join(serverRoot, file))
      .pipe(Effect.map((info) => Number(info.size)))
  );
  const serverModuleBytes = Array.reduce(
    serverSizes,
    0,
    (total, size) => total + size
  );
  yield* requireProof(serverModuleBytes <= 67_108_864, "filesystem");
  const sources = yield* Effect.forEach(
    Array.filter(
      serverFiles,
      (file) => file.endsWith(".js") || file.endsWith(".mjs")
    ),
    (file) =>
      readArtifactBytes(path.join(serverRoot, file), "filesystem").pipe(
        Effect.map((bytes) => ({
          path: file,
          source: new TextDecoder().decode(bytes),
        }))
      )
  );
  const filesystemModules = Array.filter(sources, ({ source }) =>
    /(?:node:fs|node:fs\/promises)/u.test(source)
  );
  yield* requireProof(
    filesystemModules.length === 2 &&
      Array.every(
        filesystemModules,
        ({ path: file, source }) =>
          /^assets\/(?:loaders\.server|runtime\.server|policy)-[A-Za-z0-9_-]+\.js$/u.test(
            file
          ) && !source.includes(repositoryRoot)
      ),
    "filesystem"
  );
  const contentSource = Array.findFirst(filesystemModules, ({ path: file }) =>
    /^assets\/(?:loaders|runtime)\.server-[A-Za-z0-9_-]+\.js$/u.test(file)
  ).pipe(
    Option.map((value) => value.source),
    Option.getOrElse(() => "")
  );
  yield* requireProof(
    /validateContent:\s*\(\)\s*=>[\s\S]*?import\("\.\/policy-[A-Za-z0-9_-]+\.js"\)/u.test(
      contentSource
    ) &&
      /if\s*\(type\s*===\s*"raw"\)[\s\S]*?import\("node:fs\/promises"\)/u.test(
        contentSource
      ) &&
      /getText\("processed"\)/u.test(contentSource),
    "filesystem"
  );
  const emitted = Array.map(sources, ({ source }) => source).join("\n");
  yield* requireProof(
    !/runtimeConstructionCount|randomUUID/u.test(emitted) &&
      emitted.match(/var DocsRuntimeProbe =/gu)?.length === 1 &&
      emitted.match(/var docsRuntimeProbeLive =/gu)?.length === 1 &&
      emitted.match(/var docsRuntime = createDocsRuntime\(/gu)?.length === 1,
    "configuration"
  );
  const allBuiltFiles = yield* fs.glob("**/*", { root: builtRoot });
  yield* requireProof(allBuiltFiles.length <= 10_000, "filesystem");
  const allBuiltSizes = yield* Effect.forEach(allBuiltFiles, (file) =>
    fs
      .stat(path.join(builtRoot, file))
      .pipe(
        Effect.map((info) => (info.type === "File" ? Number(info.size) : 0))
      )
  );
  yield* requireProof(
    Array.reduce(allBuiltSizes, 0, (total, bytes) => total + bytes) <=
      67_108_864,
    "filesystem"
  );
  const allSources = yield* Effect.forEach(allBuiltFiles, (file) =>
    Effect.gen(function* () {
      const full = path.join(builtRoot, file);
      const info = yield* fs.stat(full);
      if (info.type !== "File") {
        return "";
      }
      return yield* readArtifactBytes(full, "filesystem").pipe(
        Effect.map((bytes) => new TextDecoder().decode(bytes))
      );
    })
  );
  yield* requireProof(
    Array.every(
      [
        "ALCHEMY_PASSWORD",
        "CLOUDFLARE_API_TOKEN",
        "CLOUDFLARE_ACCOUNT_ID",
        "GITHUB_TOKEN",
      ],
      (name) => !Array.some(allSources, (source) => source.includes(name))
    ),
    "configuration"
  );
  return { filesystemModules, generatedConfig, serverModuleBytes } as const;
});

export const LocalCloudflareBuiltProofLive = Layer.effect(
  LocalCloudflareBuiltProof,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const crypto = yield* Crypto.Crypto;
    const client = yield* HttpClient.HttpClient;
    const context = yield* Effect.context<
      | FileSystem.FileSystem
      | Path.Path
      | Crypto.Crypto
      | ChildProcessSpawner.ChildProcessSpawner
    >();
    const appRoot = yield* path.fromFileUrl(new URL("../", import.meta.url));
    const repositoryRoot = yield* path.fromFileUrl(
      new URL("../../../", import.meta.url)
    );
    const builtRoot = path.join(appRoot, "dist");
    const receiptRoot = path.join(repositoryRoot, "tmp/docs-cloudflare");
    return LocalCloudflareBuiltProof.of({
      verifyBuiltDeployment: Effect.fn(
        "LocalCloudflareBuiltProof.verifyBuiltDeployment"
      )(
        function* (options) {
          const input = yield* Config.schema(LocalEnvironment).pipe(
            Effect.mapError(
              () =>
                new BuiltProofError({
                  operation: "configuration",
                  reason: "configuration",
                })
            )
          );
          const { PATH: systemPath, ...optionalInput } = input;
          const environment = {
            PATH: systemPath,
            ...Record.fromEntries(
              Array.flatMap(Record.toEntries(optionalInput), ([name, value]) =>
                Option.match(value, {
                  onNone: () => [],
                  onSome: (text) => [[name, text] as const],
                })
              )
            ),
          };
          const processEnvironment = {
            ...environment,
            NO_COLOR: "1",
            WRANGLER_SEND_METRICS: "false",
            XDG_CONFIG_HOME: path.join(receiptRoot, "provider-config"),
          };
          yield* fs.remove(builtRoot, { force: true, recursive: true });
          yield* runCommand(
            "build",
            "bun",
            ["run", "build:cloudflare"],
            appRoot,
            processEnvironment
          );
          const { filesystemModules, generatedConfig, serverModuleBytes } =
            yield* inspectBuiltArtifacts(builtRoot, repositoryRoot);
          const temporaryRoot = yield* fs.makeTempDirectoryScoped({
            prefix: "taxkit-docs-workerd-",
          });
          const isolatedDist = path.join(temporaryRoot, "dist");
          const isolatedConfigPath = path.join(
            isolatedDist,
            "server/wrangler.json"
          );
          yield* fs.copy(builtRoot, isolatedDist);
          // Generated extra fields survive unchanged; only these two existing
          // checkout metadata fields are removed from the isolated source.
          const isolatedConfig = Record.remove(
            Record.remove(generatedConfig, "configPath"),
            "userConfigPath"
          );
          const configJson = yield* Schema.encodeEffect(
            Schema.fromJsonString(UnknownRecord, { space: 2 })
          )(isolatedConfig);
          yield* fs.writeFileString(isolatedConfigPath, `${configJson}\n`);
          const wrangler = path.join(appRoot, "node_modules/.bin/wrangler");
          const dryRun = yield* runCommand(
            "dry-run",
            wrangler,
            [
              "deploy",
              "--dry-run",
              "--config",
              "dist/server/wrangler.json",
              "--outdir",
              "dry-run",
            ],
            temporaryRoot,
            processEnvironment
          );
          const workerModulesSha256 = yield* digestBuiltProofDirectory(
            path.join(temporaryRoot, "dry-run"),
            true
          );
          const assetsSha256 = yield* digestBuiltProofDirectory(
            path.join(isolatedDist, "client"),
            false
          );
          const deploymentInputSha256 = yield* crypto
            .digest(
              "SHA-256",
              new TextEncoder().encode(
                `worker-modules\0${workerModulesSha256}\0assets\0${assetsSha256}\0`
              )
            )
            .pipe(
              Effect.map(Hex.encode),
              Effect.flatMap(HostedProofSha256.makeEffect)
            );
          const sizes = yield* Option.fromNullishOr(
            /Total Upload:\s*(?<upload>[\d.]+)\s*KiB\s*\/\s*gzip:\s*(?<gzip>[\d.]+)\s*KiB/u.exec(
              dryRun
            )?.groups
          ).pipe(
            Effect.fromOption,
            Effect.mapError(() => failure("dry-run"))
          );
          const rawUpload = yield* Record.get(sizes, "upload").pipe(
            Effect.fromOption,
            Effect.mapError(() => failure("dry-run"))
          );
          const gzipUpload = yield* Record.get(sizes, "gzip").pipe(
            Effect.fromOption,
            Effect.mapError(() => failure("dry-run"))
          );
          const rawUploadBytes = Number(rawUpload) * 1024;
          const gzipUploadBytes = Number(gzipUpload) * 1024;
          yield* requireProof(
            /No bindings found\./u.test(dryRun) &&
              Number.isFinite(gzipUploadBytes) &&
              gzipUploadBytes < 3_145_728,
            "dry-run"
          );
          const origin = yield* BunHttpServer.make({
            hostname: "127.0.0.1",
            port: 0,
          }).pipe(
            Effect.map((server) => HttpServer.formatAddress(server.address)),
            Effect.scoped,
            Effect.flatMap(BuiltBrowserInput.fields.origin.makeEffect)
          );
          const { port } = new URL(origin);
          const processStarted = yield* Clock.monotonicTimeNanos;
          const handle = yield* ChildProcess.make(
            wrangler,
            [
              "dev",
              "--config",
              "dist/server/wrangler.json",
              "--ip",
              "127.0.0.1",
              "--port",
              port,
              "--local",
              "--show-interactive-dev-session",
              "false",
            ],
            {
              cwd: temporaryRoot,
              env: processEnvironment,
              extendEnv: false,
              forceKillAfter: "5 seconds",
              stderr: "pipe",
              stdin: "ignore",
              stdout: "pipe",
            }
          );
          const stdout = yield* readBuiltProofOutput(
            handle.stdout,
            "local-worker"
          ).pipe(Effect.forkScoped);
          const stderr = yield* readBuiltProofOutput(
            handle.stderr,
            "local-worker"
          ).pipe(Effect.forkScoped);
          const observed = yield* Ref.make<
            readonly (typeof ProcessEntry.Type)[]
          >([]);
          yield* Effect.addFinalizer(() =>
            Effect.gen(function* () {
              yield* handle.kill({
                forceKillAfter: "5 seconds",
                killSignal: "SIGTERM",
              });
              yield* handle.exitCode;
              const output = yield* Effect.all(
                [Fiber.join(stdout), Fiber.join(stderr)],
                { concurrency: 2 }
              );
              yield* requireProof(
                !/(?:\[wrangler:error\]|Uncaught|Internal error|Error 110[12])/u.test(
                  output.join("\n")
                ),
                "cleanup"
              );
              const remaining = yield* waitForDescendantExit(
                yield* Ref.get(observed),
                repositoryRoot,
                processEnvironment,
                50
              );
              yield* requireProof(remaining.length === 0, "cleanup");
            }).pipe(
              Effect.mapError((error) =>
                Match.value(error).pipe(
                  Match.tag("BuiltProofError", (value) => value),
                  Match.orElse(() => failure("cleanup"))
                )
              ),
              Effect.orDie
            )
          );
          const initialVisit: (attempt: number) => Effect.Effect<
            {
              readonly response: HttpClientResponse;
              readonly requestMs: number;
            },
            BuiltProofError
          > = (attempt) =>
            Effect.gen(function* () {
              if (
                attempt >= 300 ||
                !(yield* handle.isRunning.pipe(
                  Effect.mapError(() => failure("readiness"))
                ))
              ) {
                return yield* new BuiltProofError({
                  operation: "readiness",
                  reason: "timeout",
                });
              }
              const started = yield* Clock.monotonicTimeNanos;
              const response = yield* client
                .get(`${origin}${knownPath}`, { headers: runtimeHeaders })
                .pipe(Effect.option);
              if (Option.isSome(response)) {
                return {
                  requestMs:
                    Number((yield* Clock.monotonicTimeNanos) - started) /
                    1_000_000,
                  response: response.value,
                };
              }
              yield* Effect.sleep(50);
              return yield* initialVisit(attempt + 1);
            });
          const initial = yield* initialVisit(0);
          const processStartMs =
            Number((yield* Clock.monotonicTimeNanos) - processStarted) /
            1_000_000;
          const initialHtml = yield* initial.response.text;
          yield* requireProof(
            initial.response.status === 200 &&
              /Calculate Australian take-home pay/u.test(initialHtml) &&
              Headers.get(
                initial.response.headers,
                "x-taxkit-docs-runtime-constructions"
              ).pipe(Option.contains("1")),
            "local-worker"
          );
          const isolate = yield* Headers.get(
            initial.response.headers,
            "x-taxkit-docs-runtime-isolate"
          ).pipe(
            Effect.fromOption,
            Effect.flatMap(Schema.decodeEffect(Schema.NonEmptyString)),
            Effect.mapError(() => failure("local-worker"))
          );
          const children = descendants(
            yield* readProcessTable(repositoryRoot, processEnvironment),
            handle.pid
          );
          yield* Ref.set(observed, children);
          const workerdChildren = Array.filter(children, ({ command }) =>
            /(?:^|\/)workerd(?:@1\.20260722\.1)?(?:\/|\s|$)/u.test(command)
          );
          yield* requireProof(
            children.length > 0 && workerdChildren.length > 0,
            "process-table"
          );
          const assetGroups = yield* Option.fromNullishOr(
            /(?:src|href)="(?<asset>\/assets\/[^"]+\.(?:css|js))"/u.exec(
              initialHtml
            )?.groups
          ).pipe(
            Effect.fromOption,
            Effect.mapError(() => failure("local-worker"))
          );
          const assetPath = yield* Record.get(assetGroups, "asset").pipe(
            Effect.fromOption,
            Effect.mapError(() => failure("local-worker"))
          );
          const asset = yield* client.get(`${origin}${assetPath}`);
          const assetBody = yield* asset.text;
          const contentType = Headers.get(asset.headers, "content-type").pipe(
            Option.getOrElse(() => "")
          );
          const cacheControl = Headers.get(asset.headers, "cache-control").pipe(
            Option.getOrElse(() => "")
          );
          yield* requireProof(
            asset.status === 200 &&
              /css|javascript/u.test(contentType) &&
              /max-age=31536000/u.test(cacheControl) &&
              /immutable/u.test(cacheControl) &&
              Headers.get(asset.headers, "etag").pipe(
                Option.exists((value) => value.length > 0)
              ) &&
              !/<!doctype html>/iu.test(assetBody.slice(0, 100)),
            "local-worker"
          );
          const missing = yield* client.get(`${origin}${missingPath}`, {
            headers: runtimeHeaders,
          });
          const missingHtml = yield* missing.text;
          yield* requireProof(
            missing.status === 404 &&
              /Documentation page not found/u.test(missingHtml) &&
              Headers.get(
                missing.headers,
                "x-taxkit-docs-runtime-constructions"
              ).pipe(Option.contains("1")) &&
              Headers.get(
                missing.headers,
                "x-taxkit-docs-runtime-isolate"
              ).pipe(Option.contains(isolate)),
            "local-worker"
          );
          const journeys = [
            [knownPath, "Calculate Australian take-home pay"],
            ["/start/install-the-sdk", "Install the SDK"],
            ["/reference", "Reference"],
          ] as const;
          yield* Effect.forEach(
            Array.flatMap(journeys, (journey) => Array.replicate(journey, 3)),
            ([target, expected]) =>
              Effect.gen(function* () {
                const response = yield* client.get(`${origin}${target}`, {
                  headers: runtimeHeaders,
                });
                const body = yield* response.text;
                yield* requireProof(
                  response.status === 200 &&
                    body.includes(expected) &&
                    Headers.get(
                      response.headers,
                      "x-taxkit-docs-runtime-constructions"
                    ).pipe(Option.contains("1")) &&
                    Headers.get(
                      response.headers,
                      "x-taxkit-docs-runtime-isolate"
                    ).pipe(Option.contains(isolate)),
                  "local-worker"
                );
              }),
            { concurrency: 9 }
          );
          const browserInput = yield* BuiltBrowserInput.makeEffect({
            captureScreenshots: options.captureScreenshots,
            environment: processEnvironment,
            origin,
            screenshotDirectory: path.join(receiptRoot, "screenshots"),
          });
          const browserObservation = yield* verifyBuiltBrowser(browserInput);
          const commitText = yield* runCommand(
            "git-revision",
            "/usr/bin/git",
            ["rev-parse", "HEAD"],
            repositoryRoot,
            processEnvironment
          );
          const sourceCommit =
            yield* BuiltProofCandidate.fields.sourceCommit.makeEffect(
              commitText.trim()
            );
          // createRequire only resolves installed manifest identities; it performs
          // no provider request. Its fallible host call stays in this live adapter.
          const manifests = yield* Effect.try({
            catch: () => failure("configuration"),
            try: () => {
              const ownRequire = createRequire(import.meta.url);
              const wranglerManifest = ownRequire.resolve(
                "wrangler/package.json"
              );
              const wranglerRequire = createRequire(wranglerManifest);
              return [
                ownRequire.resolve("@cloudflare/vite-plugin/package.json"),
                wranglerManifest,
                wranglerRequire.resolve("workerd/package.json"),
              ] as const;
            },
          });
          const [vitePath, wranglerPath, workerdPath] = manifests;
          const [viteManifest, wranglerManifest, workerdManifest] =
            yield* Effect.all([
              readArtifactBytes(vitePath, "configuration").pipe(
                Effect.map((bytes) => new TextDecoder().decode(bytes)),
                Effect.flatMap(
                  Schema.decodeEffect(Schema.fromJsonString(DependencyManifest))
                )
              ),
              readArtifactBytes(wranglerPath, "configuration").pipe(
                Effect.map((bytes) => new TextDecoder().decode(bytes)),
                Effect.flatMap(
                  Schema.decodeEffect(Schema.fromJsonString(DependencyManifest))
                )
              ),
              readArtifactBytes(workerdPath, "configuration").pipe(
                Effect.map((bytes) => new TextDecoder().decode(bytes)),
                Effect.flatMap(
                  Schema.decodeEffect(Schema.fromJsonString(DependencyManifest))
                )
              ),
            ]);
          const firstModule = yield* Array.head(filesystemModules).pipe(
            Effect.fromOption
          );
          const secondModule = yield* Array.last(filesystemModules).pipe(
            Effect.fromOption
          );
          const receipt = yield* BuiltProofReceipt.makeEffect({
            browser: {
              name: "Chromium",
              version: browserObservation.browserVersion,
            },
            candidate: {
              assetsSha256,
              deploymentInputSha256,
              sourceCommit,
              workerModulesSha256,
              worktreeQualifiedBeforeCommit: true,
            },
            dependencies: {
              cloudflareVitePlugin: viteManifest.version,
              workerd: workerdManifest.version,
              wrangler: wranglerManifest.version,
            },
            evidenceClass: "local-workerd",
            filesystem: {
              isolatedOutputOnlyExecution: true,
              nodeFileSystemModules: [firstModule.path, secondModule.path],
              providerCredentialEnvironmentAllowed: false,
              requestTimePolicyImportObserved: false,
            },
            limits: {
              firstResponseRequestMs: Number(initial.requestMs.toFixed(2)),
              gzipUploadBytes,
              localProcessStartToFirstResponseMs: Number(
                processStartMs.toFixed(2)
              ),
              rawServerModuleBytes: serverModuleBytes,
              rawUploadBytes,
              workerSizeLimitBytes: 3_145_728,
            },
            nonClaims: [
              "Local workerd does not prove a Cloudflare account, provider deployment, workers.dev URL, remote state, Preview, Production or rollback.",
              "The startup observation is local workerd evidence; provider startup validation remains required.",
            ],
            oracles: {
              accessibility: "passed",
              assetCacheHeaders: "passed",
              assets: "passed",
              clientNavigationWithoutDocumentReload: "passed",
              clientNotFound: "passed",
              concurrentRequestIsolation: "passed",
              consoleAndPageErrors: "passed",
              directNotFound: "passed",
              hydration: "passed",
              malformedServerFunction: "passed",
              mobileNavigationDisclosure: "passed",
              pendingNavigation: "passed",
              recoverableError: "passed",
              reducedMotion: "passed",
              serverFunctionTransport: "passed",
              ssr: "passed",
            },
            owner: "DCD-001 local Cloudflare built-app harness",
            runtime: {
              concurrentRequestsPassed: 9,
              observedConstructionCount: 1,
              observedDescendantCount: children.length,
              observedIsolateId: isolate,
              observedWorkerdDescendantCount: workerdChildren.length,
              perRequestConstructionPatternAbsent: true,
            },
            schemaVersion: 1,
            screenshots: browserObservation.screenshots,
          });
          return {
            receipt,
            serverFunctionRequests: browserObservation.serverFunctionRequests,
          };
        },
        Effect.provide(context),
        Effect.timeoutOrElse({
          duration: "5 minutes",
          orElse: () =>
            Effect.fail(
              new BuiltProofError({
                operation: "local-worker",
                reason: "timeout",
              })
            ),
        }),
        Effect.mapError((error) =>
          Match.value(error).pipe(
            Match.tag("BuiltProofError", (value) => value),
            Match.orElse(() => failure("local-worker"))
          )
        ),
        Effect.scoped
      ),
    });
  })
);
