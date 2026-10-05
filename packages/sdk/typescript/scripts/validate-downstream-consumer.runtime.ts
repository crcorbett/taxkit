import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array as EffectArray,
  Console,
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
import { ChildProcess } from "effect/process";

import {
  DependencyRecord,
  DependencySectionName,
  PackedPackageManifest,
  RootPackageManifest,
} from "./schemas.js";

const PackageClosureItem = Schema.Struct({
  build: Schema.Boolean,
  packageName: Schema.String,
  relativeRoot: Schema.String,
});
type PackageClosureItem = typeof PackageClosureItem.Type;

const PackedPackageEvidence = Schema.Struct({
  manifest: Schema.toType(PackedPackageManifest),
  packageName: Schema.String,
  packedFileCount: Schema.Finite,
  publicEntrypoints: Schema.Array(Schema.String),
  rootPath: Schema.String,
  tarballFile: Schema.String,
  tarballPath: Schema.String,
});
type PackedPackageEvidence = typeof PackedPackageEvidence.Type;
const ManifestProtocolFinding = Schema.Struct({
  dependencyName: Schema.String,
  packageName: Schema.String,
  protocol: Schema.Literals(["catalog:", "workspace:"]),
  range: Schema.String,
  section: DependencySectionName,
});
type ManifestProtocolFinding = typeof ManifestProtocolFinding.Type;
const DownstreamValidationEvidence = Schema.Struct({
  artifactsPath: Schema.String,
  browserBundleResult: Schema.String,
  cleanupResult: Schema.String,
  devDiagnostics: Schema.Array(ManifestProtocolFinding),
  installResult: Schema.String,
  installStrategy: Schema.String,
  packedArtifacts: Schema.Array(Schema.String),
  releaseBlockers: Schema.Array(ManifestProtocolFinding),
  runtimeSdkResult: Schema.String,
  tempWorkspacePath: Schema.String,
  typecheckResult: Schema.String,
});
type DownstreamValidationEvidence = typeof DownstreamValidationEvidence.Type;

class DownstreamCommandError extends Schema.TaggedError<DownstreamCommandError>()(
  "DownstreamCommandError",
  {
    exitCode: Schema.Option(Schema.Finite),
    reason: Schema.Literals(["start-or-read", "exit", "output-limit"]),
    stage: Schema.String,
  }
) {}
class DownstreamReleaseBlockerError extends Schema.TaggedError<DownstreamReleaseBlockerError>()(
  "DownstreamReleaseBlockerError",
  { evidence: DownstreamValidationEvidence }
) {}
class DownstreamValidationError extends Schema.TaggedError<DownstreamValidationError>()(
  "DownstreamValidationError",
  { message: Schema.String }
) {}

const ConsumerTsConfig = Schema.Struct({
  compilerOptions: Schema.Struct({
    lib: Schema.Array(Schema.String),
    module: Schema.String,
    moduleResolution: Schema.String,
    noEmit: Schema.Boolean,
    strict: Schema.Boolean,
    target: Schema.String,
    types: Schema.Array(Schema.String),
  }),
  include: Schema.Array(Schema.String),
});
const ConsumerPackageManifest = Schema.Struct({
  dependencies: DependencyRecord,
  devDependencies: DependencyRecord,
  name: Schema.Literal("taxkit-sdk-downstream-consumer"),
  overrides: DependencyRecord,
  private: Schema.Literal(true),
  scripts: DependencyRecord,
  type: Schema.Literal("module"),
});

const packageClosure = [
  {
    build: true,
    packageName: "@taxkit/core",
    relativeRoot: "packages/core",
  },
  {
    build: true,
    packageName: "@taxkit/rules-au-income-tax",
    relativeRoot: "packages/rules/au/income-tax",
  },
  {
    build: true,
    packageName: "@taxkit/rules-au-pay",
    relativeRoot: "packages/rules/au/pay",
  },
  {
    build: true,
    packageName: "@taxkit/rules-au-stsl",
    relativeRoot: "packages/rules/au/stsl",
  },
  {
    build: true,
    packageName: "@taxkit/calculators",
    relativeRoot: "packages/calculators",
  },
  {
    build: true,
    packageName: "@taxkit/sdk",
    relativeRoot: "packages/sdk/typescript",
  },
  {
    build: true,
    packageName: "@taxkit/api-http",
    relativeRoot: "packages/api/http",
  },
  {
    build: true,
    packageName: "@taxkit/testing",
    relativeRoot: "packages/testing",
  },
  {
    build: false,
    packageName: "@taxkit/tsconfig",
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
      const [stdout, , exitCode] = yield* Effect.all(
        [
          handle.stdout.pipe(
            Stream.mapAccum(
              () => 0,
              (previousBytes, chunk) => {
                const bytes = previousBytes + chunk.byteLength;
                return [bytes, [{ bytes, chunk }]] as const;
              }
            ),
            Stream.mapEffect(({ bytes, chunk }) =>
              bytes > 1_048_576
                ? Effect.fail(
                    new DownstreamCommandError({
                      exitCode: Option.none(),
                      reason: "output-limit",
                      stage: label,
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

      return {
        commandLine: commandLine(command, args),
        cwd,
        exitCode: Number(exitCode),
        stdout,
      };
    }).pipe(
      Effect.mapError((failure) =>
        Match.value(failure).pipe(
          Match.tag("DownstreamCommandError", (error) => error),
          Match.orElse(
            () =>
              new DownstreamCommandError({
                exitCode: Option.none(),
                reason: "start-or-read",
                stage: label,
              })
          )
        )
      )
    );

    return yield* Match.value(result.exitCode).pipe(
      Match.when(0, () => Effect.succeed(result)),
      Match.orElse(() =>
        Effect.fail(
          new DownstreamCommandError({
            exitCode: Option.some(result.exitCode),
            reason: "exit",
            stage: label,
          })
        )
      )
    );
  }).pipe(Effect.scoped);

const tarballPathFromPackOutput = (packageName: string, output: string) =>
  Schema.decodeEffect(Schema.NonEmptyString)(output.trim()).pipe(
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
        : target.default.pipe(
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
            EffectRecord.get(targetValue, condition)
              .pipe(Option.flatten)
              .pipe(
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
        : target.source.pipe(
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
    EffectRecord.get(
      {
        dependencies: manifest.dependencies,
        devDependencies: manifest.devDependencies,
        optionalDependencies: manifest.optionalDependencies,
        peerDependencies: manifest.peerDependencies,
      },
      section
    )
      .pipe(Option.flatten)
      .pipe(
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

const catalogVersion = (
  catalog: typeof DependencyRecord.Type,
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
  Effect.gen(function* () {
    yield* fs.makeDirectory(path.join(workspacePath, "src"), {
      recursive: true,
    });
    const tsconfigJson = yield* Schema.encodeEffect(
      Schema.fromJsonString(ConsumerTsConfig, { space: 2 })
    )({
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
    }).pipe(
      Effect.mapError(
        () =>
          new DownstreamValidationError({
            message: "Failed to encode downstream tsconfig.json.",
          })
      )
    );
    yield* Effect.all(
      [
        fs.writeFileString(
          path.join(workspacePath, "tsconfig.json"),
          `${tsconfigJson}\n`
        ),
        fs.writeFileString(
          path.join(workspacePath, "src/typecheck.ts"),
          `import { PublicCalculatorServiceBounded } from "@taxkit/calculators/work";
import type { CalculationInput } from "@taxkit/sdk";
import { TaxKit, TaxKitCalculationError } from "@taxkit/sdk";
import { calculateReport } from "@taxkit/sdk/effect";
import { au } from "@taxkit/sdk/au";
import { auEffect } from "@taxkit/sdk/au/effect";
import {
  CalculatorRunRequest,
  CalculatorServiceError,
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
  TaxKitFailure,
  TaxKitSuccess,
} from "@taxkit/sdk/schemas";
import { AuPayTakeHomeCalculation } from "@taxkit/sdk/testing";
import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";

const takeHomeFacts: CalculationInput<typeof au.calculations.takeHomePay> = {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

TaxKit.calculate(au.calculations.takeHomePay, takeHomeFacts);
TaxKit.safe.calculate(au.calculations.takeHomePay, takeHomeFacts);
const plainClient = TaxKit.createClient(au.modules.pay2025_26);
const clientReport: Promise<typeof au.calculations.takeHomePay.outputSchema.Type> = plainClient.calculations.calculate(au.calculations.takeHomePay, takeHomeFacts);
const clientClosed: Promise<void> = plainClient.dispose();
void clientReport;
void clientClosed;
// @ts-expect-error annual tax is outside this plain client's selected module.
plainClient.calculations.calculate(au.calculations.annualIncomeTax, { taxableIncome: aud(9_000_000) });
au.pay.takeHomePay(takeHomeFacts);
au.pay.safe.withholdings(takeHomeFacts);
calculateReport(au.calculations.takeHomePay, takeHomeFacts);
auEffect
  .createClient()
  .calculations.calculateReport(au.calculations.takeHomePay, takeHomeFacts);

void PublicCalculatorServiceBounded;
void CalculatorRunRequest;
void CalculatorServiceError;
const workFailure: typeof CalculatorServiceError.Type = new CalculatorCapacityExceeded();
const workTimeout: typeof CalculatorServiceError.Type = new CalculatorOperationTimedOut();
void workFailure;
void workTimeout;
void TaxKitFailure;
void TaxKitSuccess;
void AuPayTakeHomeCalculation;

au.pay.takeHomePay({
  // @ts-expect-error annual-tax facts cannot be submitted to take-home pay.
  taxableIncome: aud(9_000_000),
});
`
        ),
        fs.writeFileString(
          path.join(workspacePath, "src/runtime.ts"),
          `import { PublicCalculatorServiceBounded, CalculatorConcurrencyLimit } from "@taxkit/calculators/work";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculationEngineLive } from "@taxkit/core";
import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { Effect, Layer, Schema } from "effect";
import { TaxKit, TaxKitCalculationError } from "@taxkit/sdk";
import { calculateReport } from "@taxkit/sdk/effect";
import { au } from "@taxkit/sdk/au";

const ServiceLive = PublicCalculatorServiceBounded.pipe(
  Layer.provide(PublicCalculatorServiceLive),
  Layer.provide(CalculationEngineLive)
);
if (CalculatorConcurrencyLimit !== 8) {
  throw new Error("Packed calculation policy has the wrong capacity.");
}
const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

const plainReport = await TaxKit.calculate(
  au.calculations.takeHomePay,
  takeHomeFacts
);
const effectReport = await Effect.runPromise(
  calculateReport(au.calculations.takeHomePay, takeHomeFacts).pipe(
    Effect.provide(ServiceLive)
  )
);
const plainAnnualReport = await au.incomeTax.annual({
  taxableIncome: aud(9_000_000),
});
const effectAnnualReport = await Effect.runPromise(
  calculateReport(au.calculations.annualIncomeTax, {
    taxableIncome: aud(9_000_000),
  }).pipe(Effect.provide(ServiceLive))
);

if (plainReport._tag !== "TakeHomePayReport") {
  throw new Error("Plain SDK downstream calculation returned the wrong report.");
}

if (effectReport._tag !== "TakeHomePayReport") {
  throw new Error("Effect SDK downstream calculation returned the wrong report.");
}

if (plainReport.rulePackVersion !== "rules-au-pay/1.0.0") {
  throw new Error("Plain SDK downstream calculation returned the wrong pay ruleset version.");
}

if (effectReport.rulePackVersion !== "rules-au-pay/1.0.0") {
  throw new Error("Effect SDK downstream calculation returned the wrong pay ruleset version.");
}

if (plainAnnualReport.rulePackVersion !== "rules-au-income-tax/1.0.0") {
  throw new Error("Plain AU SDK downstream calculation returned the wrong income-tax ruleset version.");
}

if (effectAnnualReport.rulePackVersion !== "rules-au-income-tax/1.0.0") {
  throw new Error("Effect SDK downstream calculation returned the wrong income-tax ruleset version.");
}

const client = au.createClient();
const clientReport = await client.calculations.calculate(au.calculations.takeHomePay, takeHomeFacts);
const clientAnnual = await client.calculations.calculate(au.calculations.annualIncomeTax, { taxableIncome: aud(9_000_000) });
const clientWithholdings = await client.calculations.calculate(au.calculations.payWithholdings, takeHomeFacts);
if (clientReport.netPay.cents !== 130_100 || clientAnnual.liability.cents !== 1_958_800 || clientWithholdings.total.cents !== 35_300) {
  throw new Error("Caller-owned SDK client changed retained calculator results.");
}
await client.dispose();
await client.dispose();
const closed = await client.calculations.safe.calculate(au.calculations.takeHomePay, takeHomeFacts);
if (closed._tag !== "TaxKitFailure" || closed.error.error._tag !== "TaxKitClientDisposedError") {
  throw new Error("Disposed SDK client returned the wrong safe failure.");
}
try {
  await client.calculations.calculate(au.calculations.takeHomePay, takeHomeFacts);
  throw new Error("Disposed SDK client succeeded.");
} catch (error) {
  if (!Schema.is(TaxKitCalculationError)(error) || error.error._tag !== "TaxKitClientDisposedError") {
    throw new Error("Disposed SDK client rejected without its stable public error.");
  }
}
console.log("Downstream SDK runtime examples passed, including three caller-owned calculations and disposal.");
`
        ),
        fs.writeFileString(
          path.join(workspacePath, "src/browser-entry.ts"),
          `import { TaxKit } from "@taxkit/sdk";
import { au } from "@taxkit/sdk/au";
import { CalculatorRunRequest } from "@taxkit/sdk/schemas";

export const browserSafeEntrypoints = {
  root: typeof TaxKit.calculate === "function",
  au: typeof au.pay.takeHomePay === "function",
  schemas: Boolean(CalculatorRunRequest),
} as const;
`
        ),
      ],
      { concurrency: 1 }
    );
  });

const writePublicEntrypointSmoke = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  workspacePath: string,
  packedPackages: readonly PackedPackageEvidence[]
) =>
  Effect.gen(function* writePublicImports() {
    const entrypointsJson = yield* Schema.encodeEffect(
      Schema.fromJsonString(Schema.Array(Schema.String), { space: 2 })
    )(
      EffectArray.flatMap(
        packedPackages,
        (packedPackage) => packedPackage.publicEntrypoints
      )
    ).pipe(
      Effect.mapError(
        () =>
          new DownstreamValidationError({
            message: "Failed to encode public entrypoint fixture.",
          })
      )
    );
    yield* fs.writeFileString(
      path.join(workspacePath, "src/public-entrypoints.ts"),
      `const publicEntrypoints = ${entrypointsJson} as const;

for (const publicEntrypoint of publicEntrypoints) {
  await import(publicEntrypoint);
}

console.log(\`Imported \${publicEntrypoints.length} packed public entrypoints.\`);
`
    );
  });

const writeConsumerPackageManifest = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  workspacePath: string,
  catalog: typeof DependencyRecord.Type,
  packedPackages: readonly PackedPackageEvidence[]
) =>
  Effect.gen(function* writePackageManifest() {
    const effectVersion = yield* catalogVersion(catalog, "effect");
    const typescriptVersion = yield* catalogVersion(catalog, "typescript");
    const bunTypesVersion = yield* catalogVersion(catalog, "@types/bun");
    const taxkitDependencies = EffectRecord.fromEntries(
      EffectArray.map(packedPackages, (packedPackage) => [
        packedPackage.packageName,
        `file:./${path.relative(workspacePath, packedPackage.tarballPath)}`,
      ])
    );

    const manifestJson = yield* Schema.encodeEffect(
      Schema.fromJsonString(ConsumerPackageManifest, { space: 2 })
    )({
      dependencies: {
        ...taxkitDependencies,
        effect: effectVersion,
      },
      devDependencies: {
        "@types/bun": bunTypesVersion,
        typescript: typescriptVersion,
      },
      name: "taxkit-sdk-downstream-consumer",
      overrides: taxkitDependencies,
      private: true,
      scripts: {
        "bundle:browser":
          "bun build src/browser-entry.ts --target=browser --format=esm --outdir=dist-browser",
        runtime: "bun src/runtime.ts",
        "runtime:exports": "bun src/public-entrypoints.ts",
        typecheck: "tsc -p tsconfig.json --noEmit",
      },
      type: "module",
    }).pipe(
      Effect.mapError(
        () =>
          new DownstreamValidationError({
            message: "Failed to encode downstream package.json.",
          })
      )
    );
    yield* fs.writeFileString(
      path.join(workspacePath, "package.json"),
      `${manifestJson}\n`
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
    const workspacePackedManifest = yield* Schema.decodeEffect(
      Schema.fromJsonString(PackedPackageManifest)
    )(stagedManifestJson).pipe(
      Effect.mapError(
        () =>
          new DownstreamValidationError({
            message: "Failed to decode workspace packed package.json.",
          })
      )
    );
    const stagedPublicationJson = yield* Schema.encodeEffect(
      Schema.fromJsonString(PackedPackageManifest, { space: 2 })
    )({
      ...workspacePackedManifest,
      exports: workspacePackedManifest.publishConfig.exports,
    }).pipe(
      Effect.mapError(
        () =>
          new DownstreamValidationError({
            message: "Failed to encode staged publication package.json.",
          })
      )
    );
    yield* fs.writeFileString(stagedManifestPath, `${stagedPublicationJson}\n`);

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
        Schema.decodeEffect(Schema.fromJsonString(PackedPackageManifest))(
          result.stdout
        ).pipe(
          Effect.mapError(
            () =>
              new DownstreamValidationError({
                message: "Failed to decode publication packed package.json.",
              })
          )
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

export const checkDownstreamConsumer = Effect.gen(
  function* validateDownstreamConsumer() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const repoRootPath = yield* path.fromFileUrl(repoRootUrl);
    const sdkRootPath = yield* path.fromFileUrl(sdkRootUrl);
    const rootPackageManifest = yield* fs
      .readFileString(path.join(repoRootPath, "package.json"))
      .pipe(
        Effect.flatMap((contents) =>
          Schema.decodeEffect(Schema.fromJsonString(RootPackageManifest))(
            contents
          ).pipe(
            Effect.mapError(
              () =>
                new DownstreamValidationError({
                  message: "Failed to decode root package.json.",
                })
            )
          )
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
        prefix: "taxkit-sdk-downstream-",
      }),
      (tempPath) =>
        fs.remove(tempPath, { force: true, recursive: true }).pipe(
          Effect.tap(() => Console.info(`Cleanup result: removed ${tempPath}`)),
          Effect.catchCause(() =>
            Effect.die(
              new DownstreamValidationError({
                message: "Failed to remove the temporary SDK check folder.",
              })
            )
          )
        )
    );
    yield* validateWorkspaceLocation(path, repoRootPath, workspacePath);
    const artifactPath = path.join(workspacePath, "artifacts");
    const stagingRootPath = path.join(workspacePath, "pack-staging");

    yield* Console.info(
      `Created temp downstream workspace at ${workspacePath}`
    );
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

    const releaseBlockers = EffectArray.flatMap(
      packedPackages,
      (packedPackage) =>
        dependencyFindingsForSections(
          packedPackage.packageName,
          packedPackage.manifest,
          runtimeDependencySections
        )
    );
    const devDiagnostics = EffectArray.flatMap(
      packedPackages,
      (packedPackage) =>
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
  }
).pipe(
  Effect.mapError((error) =>
    Match.value(error).pipe(
      Match.tag(
        "PlatformError",
        () =>
          new DownstreamValidationError({
            message: "SDK check filesystem operation failed.",
          })
      ),
      Match.orElse((failure) => failure)
    )
  ),
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
      `Command failed: ${error.stage} (${error.reason}; exitCode: ${error.exitCode.pipe(Option.match({ onNone: () => "unavailable", onSome: String }))}).`
    )
  ),
  Effect.tapErrorTag("DownstreamValidationError", (error) =>
    Console.error(error.message)
  ),
  Effect.scoped
);

if (import.meta.main) {
  BunRuntime.runMain(
    checkDownstreamConsumer.pipe(Effect.provide(BunServices.layer))
  );
}
