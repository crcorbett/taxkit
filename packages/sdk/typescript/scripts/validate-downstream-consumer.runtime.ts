import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array as EffectArray,
  Console,
  Data,
  Effect,
  HashSet,
  Match,
  Option,
  Record as EffectRecord,
  Schema,
  Stream,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ChildProcess } from "effect/unstable/process";

interface PackageClosureItem {
  readonly build: boolean;
  readonly packageName: string;
  readonly relativeRoot: string;
}

interface CommandResult {
  readonly commandLine: string;
  readonly cwd: string;
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

interface PackedPackageEvidence {
  readonly manifest: PackedPackageManifest;
  readonly packageName: string;
  readonly packedFileCount: number;
  readonly publicEntrypoints: readonly string[];
  readonly rootPath: string;
  readonly tarballFile: string;
  readonly tarballPath: string;
}

interface ManifestProtocolFinding {
  readonly dependencyName: string;
  readonly packageName: string;
  readonly protocol: "catalog:" | "workspace:";
  readonly range: string;
  readonly section: DependencySectionName;
}

interface DownstreamValidationEvidence {
  readonly artifactsPath: string;
  readonly browserBundleResult: string;
  readonly cleanupResult: string;
  readonly devDiagnostics: readonly ManifestProtocolFinding[];
  readonly installResult: string;
  readonly installStrategy: string;
  readonly packedArtifacts: readonly string[];
  readonly releaseBlockers: readonly ManifestProtocolFinding[];
  readonly runtimeSdkResult: string;
  readonly tempWorkspacePath: string;
  readonly typecheckResult: string;
}

type DependencySectionName =
  | "dependencies"
  | "devDependencies"
  | "optionalDependencies"
  | "peerDependencies";

class DownstreamCommandError extends Data.TaggedError(
  "DownstreamCommandError"
)<{
  readonly result: CommandResult;
}> {}

class DownstreamReleaseBlockerError extends Data.TaggedError(
  "DownstreamReleaseBlockerError"
)<{
  readonly evidence: DownstreamValidationEvidence;
}> {}

class DownstreamValidationError extends Data.TaggedError(
  "DownstreamValidationError"
)<{
  readonly message: string;
}> {}

const DependencyRecord = Schema.Record(Schema.String, Schema.String);

const ConditionalPackageExportTarget = Schema.Struct({
  default: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  types: Schema.optional(Schema.String),
});

const PackageExportTarget = Schema.Union([
  Schema.String,
  ConditionalPackageExportTarget,
]);

const PackageExports = Schema.Record(Schema.String, PackageExportTarget);

const PackageJsonRecord = Schema.Record(Schema.String, Schema.Unknown);

const PackedPackageManifest = Schema.Struct({
  dependencies: Schema.optional(DependencyRecord),
  devDependencies: Schema.optional(DependencyRecord),
  exports: PackageExports,
  files: Schema.Array(Schema.String),
  name: Schema.String,
  optionalDependencies: Schema.optional(DependencyRecord),
  peerDependencies: Schema.optional(DependencyRecord),
  publishConfig: Schema.Struct({
    exports: PackageExports,
  }),
  version: Schema.String,
});

type PackedPackageManifest = typeof PackedPackageManifest.Type;

const RootPackageManifest = Schema.Struct({
  workspaces: Schema.Struct({
    catalog: DependencyRecord,
  }),
});

const packageClosure = [
  {
    build: true,
    packageName: "@whattax/core",
    relativeRoot: "packages/core",
  },
  {
    build: true,
    packageName: "@whattax/rules-au-income-tax",
    relativeRoot: "packages/rules/au/income-tax",
  },
  {
    build: true,
    packageName: "@whattax/rules-au-pay",
    relativeRoot: "packages/rules/au/pay",
  },
  {
    build: true,
    packageName: "@whattax/rules-au-stsl",
    relativeRoot: "packages/rules/au/stsl",
  },
  {
    build: true,
    packageName: "@whattax/calculators",
    relativeRoot: "packages/calculators",
  },
  {
    build: true,
    packageName: "@whattax/sdk",
    relativeRoot: "packages/sdk/typescript",
  },
  {
    build: true,
    packageName: "@whattax/api-http",
    relativeRoot: "packages/api/http",
  },
  {
    build: true,
    packageName: "@whattax/testing",
    relativeRoot: "packages/testing",
  },
  {
    build: false,
    packageName: "@whattax/tsconfig",
    relativeRoot: "packages/tsconfig",
  },
] satisfies readonly PackageClosureItem[];

const runtimeDependencySections = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
] satisfies readonly DependencySectionName[];

const devDependencySections = [
  "devDependencies",
] satisfies readonly DependencySectionName[];

const sdkRootUrl = new URL("..", import.meta.url);
const repoRootUrl = new URL("../../..", sdkRootUrl);

const commandLine = (command: string, args: readonly string[]) =>
  EffectArray.prepend(args, command).join(" ");

const runCommand = (
  label: string,
  command: string,
  args: readonly string[],
  cwd: string
) =>
  Effect.gen(function* runEffectCommand() {
    yield* Console.info(`$ ${commandLine(command, args)}`);

    const result = yield* Effect.gen(function* runChildProcess() {
      const handle = yield* ChildProcess.make(command, args, {
        cwd,
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
        commandLine: commandLine(command, args),
        cwd,
        exitCode: Number(exitCode),
        stderr,
        stdout,
      } satisfies CommandResult;
    }).pipe(
      Effect.mapError(
        (cause) =>
          new DownstreamCommandError({
            result: {
              commandLine: `${label}: ${commandLine(command, args)}`,
              cwd,
              exitCode: 1,
              stderr: String(cause),
              stdout: "",
            },
          })
      )
    );

    return yield* Match.value(result.exitCode).pipe(
      Match.when(0, () => Effect.succeed(result)),
      Match.orElse(() =>
        Effect.fail(
          new DownstreamCommandError({
            result,
          })
        )
      )
    );
  });

const decodeJson = <A, I, R>(
  label: string,
  schema: Schema.Schema<A, I, R>,
  value: string
) =>
  Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(value).pipe(
    Effect.mapError(
      (cause) =>
        new DownstreamValidationError({
          message: `Failed to decode ${label}: ${cause.message}`,
        })
    )
  );

const tarballPathFromPackOutput = (packageName: string, output: string) =>
  Schema.decodeUnknownEffect(Schema.NonEmptyString)(output.trim()).pipe(
    Effect.mapError(
      () =>
        new DownstreamValidationError({
          message: `bun pm pack returned no tarball path for ${packageName}.`,
        })
    )
  );

const publicEntrypointsFromManifest = (manifest: PackedPackageManifest) =>
  EffectArray.flatMap(
    EffectRecord.toEntries(manifest.exports),
    ([subpath, target]) =>
      Schema.is(Schema.String)(target)
        ? []
        : Option.fromNullishOr(target.default).pipe(
            Option.filter((defaultTarget) => defaultTarget.endsWith(".js")),
            Option.match({
              onNone: () => [],
              onSome: () => [
                subpath === "."
                  ? manifest.name
                  : `${manifest.name}${subpath.slice(1)}`,
              ],
            })
          )
  );

const packedSurfaceFailures = (
  manifest: PackedPackageManifest,
  packedFiles: readonly string[]
) => {
  const packedFileSet = HashSet.fromIterable(packedFiles);
  const exportFailures = EffectArray.flatMap(
    EffectRecord.toEntries(manifest.exports),
    ([subpath, target]) => {
      const targetFailures = Match.value(target).pipe(
        Match.when(Schema.is(Schema.String), (targetValue) =>
          HashSet.has(
            packedFileSet,
            `package/${targetValue.replace(/^\.\//u, "")}`
          )
            ? []
            : [
                `${manifest.name} ${subpath} default target ${targetValue} is absent from the tarball.`,
              ]
        ),
        Match.orElse((targetValue) =>
          EffectArray.flatMap(["types", "default"] as const, (condition) =>
            Option.fromNullishOr(targetValue[condition]).pipe(
              Option.match({
                onNone: () => [
                  `${manifest.name} ${subpath} is missing its ${condition} publication target.`,
                ],
                onSome: (value) =>
                  HashSet.has(
                    packedFileSet,
                    `package/${value.replace(/^\.\//u, "")}`
                  )
                    ? []
                    : [
                        `${manifest.name} ${subpath} ${condition} target ${value} is absent from the tarball.`,
                      ],
              })
            )
          )
        )
      );
      const sourceFailures = Schema.is(Schema.String)(target)
        ? []
        : Option.fromNullishOr(target.source).pipe(
            Option.match({
              onNone: () => [],
              onSome: (source) => [
                `${manifest.name} ${subpath} exposes source condition ${source} in the packed manifest.`,
              ],
            })
          );

      return EffectArray.appendAll(sourceFailures, targetFailures);
    }
  );
  const sourceFileFailures = EffectArray.flatMap(packedFiles, (packedFile) =>
    packedFile.startsWith("package/src/")
      ? [`${manifest.name} packed source file ${packedFile}.`]
      : []
  );
  const declaredFileFailures = EffectArray.flatMap(manifest.files, (file) =>
    file === "src" || file.startsWith("src/")
      ? [`${manifest.name} files includes source path ${file}.`]
      : []
  );

  return EffectArray.appendAll(
    EffectArray.appendAll(exportFailures, sourceFileFailures),
    declaredFileFailures
  );
};

const unsupportedProtocol = (range: string) =>
  Match.value(range).pipe(
    Match.when(
      (value) => value.startsWith("workspace:"),
      () => Option.some("workspace:" as const)
    ),
    Match.when(
      (value) => value.startsWith("catalog:"),
      () => Option.some("catalog:" as const)
    ),
    Match.orElse(() => Option.none<"catalog:" | "workspace:">())
  );

const dependencyFindingsForSections = (
  packageName: string,
  manifest: PackedPackageManifest,
  sections: readonly DependencySectionName[]
): readonly ManifestProtocolFinding[] =>
  EffectArray.flatMap(sections, (section) =>
    Option.fromNullishOr(manifest[section]).pipe(
      Option.match({
        onNone: () => [],
        onSome: (dependencies) =>
          EffectArray.flatMap(
            EffectRecord.toEntries(dependencies),
            ([dependencyName, range]) =>
              unsupportedProtocol(range).pipe(
                Option.match({
                  onNone: () => [],
                  onSome: (protocol) => [
                    {
                      dependencyName,
                      packageName,
                      protocol,
                      range,
                      section,
                    } satisfies ManifestProtocolFinding,
                  ],
                })
              )
          ),
      })
    )
  );

const relativeFileDependency =
  (path: Path.Path, workspacePath: string) =>
  (packedPackage: PackedPackageEvidence) =>
    `file:./${path.relative(workspacePath, packedPackage.tarballPath)}`;

const catalogVersion = (
  catalog: Readonly<Record<string, string>>,
  packageName: string
) =>
  EffectRecord.get(catalog, packageName).pipe(
    Option.match({
      onNone: () =>
        Effect.fail(
          new DownstreamValidationError({
            message: `Root workspace catalog does not define ${packageName}.`,
          })
        ),
      onSome: Effect.succeed,
    })
  );

const writeConsumerFiles = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  workspacePath: string
) =>
  Effect.all(
    [
      fs.makeDirectory(path.join(workspacePath, "src"), { recursive: true }),
      fs.writeFileString(
        path.join(workspacePath, "tsconfig.json"),
        `${JSON.stringify(
          {
            compilerOptions: {
              lib: ["DOM", "ES2022", "ESNext.Disposable"],
              module: "NodeNext",
              moduleResolution: "NodeNext",
              noEmit: true,
              strict: true,
              target: "ES2022",
              types: [],
            },
            include: ["src/**/*.ts"],
          },
          null,
          2
        )}\n`
      ),
      fs.writeFileString(
        path.join(workspacePath, "src/typecheck.ts"),
        `import type { CalculationInput } from "@whattax/sdk";
import { WhatTax } from "@whattax/sdk";
import { calculateReport } from "@whattax/sdk/effect";
import { au } from "@whattax/sdk/au";
import { auEffect } from "@whattax/sdk/au/effect";
import {
  CalculatorRunRequest,
  CalculatorServiceError,
  WhatTaxFailure,
  WhatTaxSuccess,
} from "@whattax/sdk/schemas";
import { AuPayTakeHomeCalculation } from "@whattax/sdk/testing";
import { aud } from "@whattax/core/primitives";
import { GrossPay } from "@whattax/rules-au-pay";

const takeHomeFacts: CalculationInput<typeof au.calculations.takeHomePay> = {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

WhatTax.calculate(au.calculations.takeHomePay, takeHomeFacts);
WhatTax.safe.calculate(au.calculations.takeHomePay, takeHomeFacts);
au.pay.takeHomePay(takeHomeFacts);
au.pay.safe.withholdings(takeHomeFacts);
calculateReport(au.calculations.takeHomePay, takeHomeFacts);
auEffect
  .createClient()
  .calculations.calculateReport(au.calculations.takeHomePay, takeHomeFacts);

void CalculatorRunRequest;
void CalculatorServiceError;
void WhatTaxFailure;
void WhatTaxSuccess;
void AuPayTakeHomeCalculation;

au.pay.takeHomePay({
  // @ts-expect-error annual-tax facts cannot be submitted to take-home pay.
  taxableIncome: aud(9_000_000),
});
`
      ),
      fs.writeFileString(
        path.join(workspacePath, "src/runtime.ts"),
        `import { PublicCalculatorServiceLive } from "@whattax/calculators/live";
import { CalculationEngineLive } from "@whattax/core";
import { aud } from "@whattax/core/primitives";
import { GrossPay } from "@whattax/rules-au-pay";
import { Effect, Layer } from "effect";
import { WhatTax } from "@whattax/sdk";
import { calculateReport } from "@whattax/sdk/effect";
import { au } from "@whattax/sdk/au";

const ServiceLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);
const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

const plainReport = await WhatTax.calculate(
  au.calculations.takeHomePay,
  takeHomeFacts
);
const effectReport = await Effect.runPromise(
  calculateReport(au.calculations.takeHomePay, takeHomeFacts).pipe(
    Effect.provide(ServiceLive)
  )
);

if (plainReport._tag !== "TakeHomePayReport") {
  throw new Error("Plain SDK downstream calculation returned the wrong report.");
}

if (effectReport._tag !== "TakeHomePayReport") {
  throw new Error("Effect SDK downstream calculation returned the wrong report.");
}

console.log("Downstream SDK runtime examples passed.");
`
      ),
      fs.writeFileString(
        path.join(workspacePath, "src/browser-entry.ts"),
        `import { WhatTax } from "@whattax/sdk";
import { au } from "@whattax/sdk/au";
import { CalculatorRunRequest } from "@whattax/sdk/schemas";

export const browserSafeEntrypoints = {
  root: typeof WhatTax.calculate === "function",
  au: typeof au.pay.takeHomePay === "function",
  schemas: Boolean(CalculatorRunRequest),
} as const;
`
      ),
    ],
    { concurrency: "unbounded" }
  );

const writePublicEntrypointSmoke = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  workspacePath: string,
  packedPackages: readonly PackedPackageEvidence[]
) =>
  fs.writeFileString(
    path.join(workspacePath, "src/public-entrypoints.ts"),
    `const publicEntrypoints = ${JSON.stringify(
      EffectArray.flatMap(
        packedPackages,
        (packedPackage) => packedPackage.publicEntrypoints
      ),
      null,
      2
    )} as const;

for (const publicEntrypoint of publicEntrypoints) {
  await import(publicEntrypoint);
}

console.log(\`Imported \${publicEntrypoints.length} packed public entrypoints.\`);
`
  );

const writeConsumerPackageManifest = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  workspacePath: string,
  catalog: Readonly<Record<string, string>>,
  packedPackages: readonly PackedPackageEvidence[]
) =>
  Effect.gen(function* writePackageManifest() {
    const effectVersion = yield* catalogVersion(catalog, "effect");
    const typescriptVersion = yield* catalogVersion(catalog, "typescript");
    const bunTypesVersion = yield* catalogVersion(catalog, "@types/bun");
    const fileDependencyFor = relativeFileDependency(path, workspacePath);
    const whattaxDependencies = EffectRecord.fromEntries(
      EffectArray.map(packedPackages, (packedPackage) => [
        packedPackage.packageName,
        fileDependencyFor(packedPackage),
      ])
    );

    yield* fs.writeFileString(
      path.join(workspacePath, "package.json"),
      `${JSON.stringify(
        {
          dependencies: {
            ...whattaxDependencies,
            effect: effectVersion,
          },
          devDependencies: {
            "@types/bun": bunTypesVersion,
            typescript: typescriptVersion,
          },
          name: "whattax-sdk-downstream-consumer",
          overrides: whattaxDependencies,
          private: true,
          scripts: {
            "bundle:browser":
              "bun build src/browser-entry.ts --target=browser --format=esm --outdir=dist-browser",
            runtime: "bun src/runtime.ts",
            "runtime:exports": "bun src/public-entrypoints.ts",
            typecheck: "tsc -p tsconfig.json --noEmit",
          },
          type: "module",
        },
        null,
        2
      )}\n`
    );
  });

const packPackage = (
  path: Path.Path,
  artifactPath: string,
  repoRootPath: string,
  stagingRootPath: string,
  packageItem: PackageClosureItem
) =>
  Effect.gen(function* packPackageManifest() {
    const fs = yield* FileSystem.FileSystem;
    const rootPath = path.join(repoRootPath, packageItem.relativeRoot);
    const packageStagingPath = path.join(
      stagingRootPath,
      packageItem.packageName.replaceAll("@", "").replaceAll("/", "-")
    );
    const rawArtifactPath = path.join(packageStagingPath, "raw-artifact");
    const unpackedPath = path.join(packageStagingPath, "unpacked");
    yield* fs.makeDirectory(rawArtifactPath, { recursive: true });
    yield* fs.makeDirectory(unpackedPath, { recursive: true });

    const rawPackOutput = yield* runCommand(
      `pack workspace manifest for ${packageItem.packageName}`,
      "bun",
      ["pm", "pack", "--destination", rawArtifactPath, "--quiet"],
      rootPath
    );
    const rawTarballPath = yield* tarballPathFromPackOutput(
      packageItem.packageName,
      rawPackOutput.stdout
    );
    yield* runCommand(
      `extract workspace tarball for ${packageItem.packageName}`,
      "tar",
      ["-xzf", rawTarballPath, "-C", unpackedPath],
      packageStagingPath
    );
    const stagedRootPath = path.join(unpackedPath, "package");
    const stagedManifestPath = path.join(stagedRootPath, "package.json");
    const stagedManifestJson = yield* fs.readFileString(stagedManifestPath);
    const [workspacePackedManifest, packageJsonRecord] = yield* Effect.all(
      [
        decodeJson(
          `${packageItem.packageName} workspace packed package.json`,
          PackedPackageManifest,
          stagedManifestJson
        ),
        decodeJson(
          `${packageItem.packageName} structured package.json`,
          PackageJsonRecord,
          stagedManifestJson
        ),
      ],
      { concurrency: "unbounded" }
    );
    yield* fs.writeFileString(
      stagedManifestPath,
      `${JSON.stringify(
        EffectRecord.set(
          packageJsonRecord,
          "exports",
          workspacePackedManifest.publishConfig.exports
        ),
        null,
        2
      )}\n`
    );

    const releasePackOutput = yield* runCommand(
      `pack publication manifest for ${packageItem.packageName}`,
      "bun",
      ["pm", "pack", "--destination", artifactPath, "--quiet"],
      stagedRootPath
    );
    const tarballPath = yield* tarballPathFromPackOutput(
      packageItem.packageName,
      releasePackOutput.stdout
    );
    const tarballFile = path.basename(tarballPath);
    const manifest = yield* runCommand(
      `extract packed manifest for ${packageItem.packageName}`,
      "tar",
      ["-xOf", tarballPath, "package/package.json"],
      artifactPath
    ).pipe(
      Effect.flatMap((result) =>
        decodeJson(
          `${packageItem.packageName} packed package.json`,
          PackedPackageManifest,
          result.stdout
        )
      )
    );
    const packedFiles = yield* runCommand(
      `list packed files for ${packageItem.packageName}`,
      "tar",
      ["-tzf", tarballPath],
      artifactPath
    ).pipe(
      Effect.map((result) =>
        EffectArray.filter(
          result.stdout.split("\n"),
          (packedFile) => packedFile.length > 0
        )
      )
    );
    const surfaceFailures = packedSurfaceFailures(manifest, packedFiles);
    yield* Match.value(surfaceFailures.length).pipe(
      Match.when(0, () => Effect.void),
      Match.orElse(() =>
        Effect.fail(
          new DownstreamValidationError({
            message: surfaceFailures.join("\n"),
          })
        )
      )
    );

    return {
      manifest,
      packageName: packageItem.packageName,
      packedFileCount: packedFiles.length,
      publicEntrypoints: publicEntrypointsFromManifest(manifest),
      rootPath,
      tarballFile,
      tarballPath,
    } satisfies PackedPackageEvidence;
  });

const printFindings = (
  title: string,
  findings: readonly ManifestProtocolFinding[]
) =>
  Match.value(findings.length).pipe(
    Match.when(0, () => Console.info(`${title}: none`)),
    Match.orElse(() =>
      Console.info(
        `${title}:\n${EffectArray.map(
          findings,
          (finding) =>
            `- ${finding.packageName} ${finding.section}.${finding.dependencyName} = ${finding.range}`
        ).join("\n")}`
      )
    )
  );

const printEvidence = (evidence: DownstreamValidationEvidence) =>
  Effect.all(
    [
      Console.info("\nDownstream SDK validation evidence"),
      Console.info(`Temp workspace: ${evidence.tempWorkspacePath}`),
      Console.info(`Artifacts: ${evidence.artifactsPath}`),
      Console.info(
        `Packed artifacts:\n${EffectArray.map(
          evidence.packedArtifacts,
          (artifact) => `- ${artifact}`
        ).join("\n")}`
      ),
      Console.info(`Install strategy: ${evidence.installStrategy}`),
      Console.info(`Install result: ${evidence.installResult}`),
      Console.info(`Typecheck result: ${evidence.typecheckResult}`),
      Console.info(`Runtime SDK result: ${evidence.runtimeSdkResult}`),
      Console.info(`Browser bundle result: ${evidence.browserBundleResult}`),
      Console.info(`Cleanup result: ${evidence.cleanupResult}`),
      printFindings("Runtime release blockers", evidence.releaseBlockers),
      printFindings("Dev manifest diagnostics", evidence.devDiagnostics),
    ],
    { concurrency: 1 }
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
        new DownstreamValidationError({
          message: `Temp workspace must be outside the repo: ${workspacePath}`,
        })
      )
    ),
    Match.orElse(() => Effect.succeed(workspacePath))
  );
};

const DownstreamProgram = Effect.gen(function* validateDownstreamConsumer() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const repoRootPath = yield* path.fromFileUrl(repoRootUrl);
  const sdkRootPath = yield* path.fromFileUrl(sdkRootUrl);
  const rootPackageManifest = yield* fs
    .readFileString(path.join(repoRootPath, "package.json"))
    .pipe(
      Effect.flatMap((contents) =>
        decodeJson("root package.json", RootPackageManifest, contents)
      )
    );

  yield* Console.info("Building SDK downstream runtime package closure.");
  yield* Effect.forEach(
    EffectArray.filter(packageClosure, (packageItem) => packageItem.build),
    (packageItem) =>
      runCommand(
        `build ${packageItem.packageName}`,
        "bun",
        ["run", "--filter", packageItem.packageName, "build"],
        repoRootPath
      ),
    { concurrency: 1 }
  );

  const workspacePath = yield* Effect.acquireRelease(
    fs.makeTempDirectory({
      prefix: "whattax-sdk-downstream-",
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
  yield* validateWorkspaceLocation(path, repoRootPath, workspacePath);
  const artifactPath = path.join(workspacePath, "artifacts");
  const stagingRootPath = path.join(workspacePath, "pack-staging");

  yield* Console.info(`Created temp downstream workspace at ${workspacePath}`);
  yield* fs.makeDirectory(artifactPath, { recursive: true });
  yield* fs.makeDirectory(stagingRootPath, { recursive: true });
  yield* writeConsumerFiles(fs, path, workspacePath);

  const packedPackages = yield* Effect.forEach(
    packageClosure,
    (packageItem) =>
      packPackage(
        path,
        artifactPath,
        repoRootPath,
        stagingRootPath,
        packageItem
      ),
    { concurrency: 1 }
  );
  yield* writePublicEntrypointSmoke(fs, path, workspacePath, packedPackages);
  yield* writeConsumerPackageManifest(
    fs,
    path,
    workspacePath,
    rootPackageManifest.workspaces.catalog,
    packedPackages
  );

  const releaseBlockers = EffectArray.flatMap(packedPackages, (packedPackage) =>
    dependencyFindingsForSections(
      packedPackage.packageName,
      packedPackage.manifest,
      runtimeDependencySections
    )
  );
  const devDiagnostics = EffectArray.flatMap(packedPackages, (packedPackage) =>
    dependencyFindingsForSections(
      packedPackage.packageName,
      packedPackage.manifest,
      devDependencySections
    )
  );
  const blockerEvidence = {
    artifactsPath: artifactPath,
    browserBundleResult: "skipped: release blockers found before install",
    cleanupResult: "scope-managed cleanup will remove the temp workspace",
    devDiagnostics,
    installResult: "skipped: packed manifests contain unresolved protocols",
    installStrategy:
      "strict manifest-diagnostic mode; packed dependency closure uses local file: references only after manifests are clean",
    packedArtifacts: EffectArray.map(
      packedPackages,
      (packedPackage) =>
        `${packedPackage.packageName} ${packedPackage.tarballFile} (${packedPackage.packedFileCount} files)`
    ),
    releaseBlockers,
    runtimeSdkResult: "skipped: release blockers found before install",
    tempWorkspacePath: workspacePath,
    typecheckResult: "skipped: release blockers found before install",
  } satisfies DownstreamValidationEvidence;

  yield* Match.value(releaseBlockers.length).pipe(
    Match.when(0, () => Effect.void),
    Match.orElse(() =>
      printEvidence(blockerEvidence).pipe(
        Effect.flatMap(() =>
          Effect.fail(
            new DownstreamReleaseBlockerError({
              evidence: blockerEvidence,
            })
          )
        )
      )
    )
  );

  yield* runCommand(
    "install downstream package closure",
    "bun",
    ["install"],
    workspacePath
  );
  const typecheck = yield* runCommand(
    "typecheck downstream SDK examples",
    "bun",
    ["run", "typecheck"],
    workspacePath
  );
  const runtime = yield* runCommand(
    "run downstream SDK examples",
    "bun",
    ["run", "runtime"],
    workspacePath
  );
  const publicExports = yield* runCommand(
    "import packed public entrypoints",
    "bun",
    ["run", "runtime:exports"],
    workspacePath
  );
  const browser = yield* runCommand(
    "bundle downstream browser-safe SDK entrypoints",
    "bun",
    ["run", "bundle:browser"],
    workspacePath
  );
  const successEvidence = {
    artifactsPath: artifactPath,
    browserBundleResult: `passed: ${browser.commandLine}`,
    cleanupResult: "scope-managed cleanup will remove the temp workspace",
    devDiagnostics,
    installResult: "passed: bun install",
    installStrategy:
      "packed dependency closure installed through local file: references",
    packedArtifacts: EffectArray.map(
      packedPackages,
      (packedPackage) =>
        `${packedPackage.packageName} ${packedPackage.tarballFile} (${packedPackage.packedFileCount} files)`
    ),
    releaseBlockers,
    runtimeSdkResult: `passed: ${runtime.commandLine}; ${publicExports.commandLine}`,
    tempWorkspacePath: workspacePath,
    typecheckResult: `passed: ${typecheck.commandLine}`,
  } satisfies DownstreamValidationEvidence;

  yield* printEvidence(successEvidence);
  yield* Console.info(`SDK root validated from ${sdkRootPath}`);
}).pipe(
  Effect.scoped,
  Effect.tapErrorTag("DownstreamReleaseBlockerError", (error) =>
    Console.error(
      [
        `Release blockers found: ${error.evidence.releaseBlockers.length} packed runtime manifest protocol blocker(s).`,
        "Strict downstream validation failed because packed manifests contain workspace:* or catalog: runtime dependency ranges.",
      ].join("\n")
    )
  ),
  Effect.tapErrorTag("DownstreamCommandError", (error) =>
    Console.error(
      [
        `Command failed: ${error.result.commandLine}`,
        `cwd: ${error.result.cwd}`,
        `exitCode: ${error.result.exitCode}`,
        error.result.stdout,
        error.result.stderr,
      ].join("\n")
    )
  ),
  Effect.tapErrorTag("DownstreamValidationError", (error) =>
    Console.error(error.message)
  )
);

BunRuntime.runMain(DownstreamProgram.pipe(Effect.provide(BunServices.layer)));
