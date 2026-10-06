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
          `import { CalculatorRequestBodyPolicy, CalculatorRequestBodyTooLarge, CalculatorRequestBodyErrorEnvelope } from "@taxkit/api-http/request-boundary";
import { PublicCalculatorServiceBounded } from "@taxkit/calculators/work";
import type { LedgerComponent, LedgerComponentEncoded } from "@taxkit/core/ledger";
import type { RuleId, TraceNode, TraceNodeEncoded } from "@taxkit/core/trace";
import type { CalculationInput } from "@taxkit/sdk";
import type { Effect, Option, Schema } from "effect";
import { TaxKit, TaxKitCalculationError } from "@taxkit/sdk";
import { calculateReport } from "@taxkit/sdk/effect";
import { au } from "@taxkit/sdk/au";
import { auEffect } from "@taxkit/sdk/au/effect";
import {
  CalculatorRunRequest,
  CalculatorServiceError,
  CalculatorCapacityExceeded,
  CalculatorOperationTimedOut,
  CalculatorMetadataError,
  TaxKitFailure,
  TaxKitSuccess,
} from "@taxkit/sdk/schemas";
import { AuPayTakeHomeCalculation } from "@taxkit/sdk/testing";
import { Cents, DateInterval, InvalidCalendarValue, InvalidMoneyValue, IsoDate, Money, aud, audFromCents, dateInterval, moneyAdd } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";

const takeHomeFacts: CalculationInput<typeof au.calculations.takeHomePay> = {
  grossPay: new GrossPay({
    amount: aud(Cents.make(165_400)),
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
plainClient.calculations.calculate(au.calculations.annualIncomeTax, { taxableIncome: aud(Cents.make(9_000_000)) });
au.pay.takeHomePay(takeHomeFacts);
au.pay.safe.withholdings(takeHomeFacts);
calculateReport(au.calculations.takeHomePay, takeHomeFacts);
auEffect
  .createClient()
  .calculations.calculateReport(au.calculations.takeHomePay, takeHomeFacts);

declare const traceValue: TraceNode;
declare const ledgerValue: LedgerComponent;
declare const traceEncoded: TraceNodeEncoded;
declare const ledgerEncoded: LedgerComponentEncoded;
const traceRule: RuleId = traceValue.ruleId;
const traceInputs: Readonly<Record<string, Schema.Json>> = traceValue.inputs;
const traceResult: Schema.Json = traceValue.result;
const traceChildren: readonly TraceNode[] = traceValue.children;
const encodedChildren: readonly TraceNodeEncoded[] = traceEncoded.children;
const componentTrace: TraceNode = ledgerValue.trace;
const encodedComponentTrace: TraceNodeEncoded = ledgerEncoded.trace;
void traceRule;
void traceInputs;
void traceResult;
void traceChildren;
void encodedChildren;
void componentTrace;
void encodedComponentTrace;

declare const checkedInterval: DateInterval;
const intervalEnd: Option.Option<Option.Option<IsoDate>> = checkedInterval.toExclusive;
const checkedAmount: Effect.Effect<Money, InvalidMoneyValue> = audFromCents(100);
const checkedSum: Effect.Effect<Money, InvalidMoneyValue> = moneyAdd(aud(Cents.make(100)), aud(Cents.make(1)));
const checkedDates: Effect.Effect<DateInterval, InvalidCalendarValue> = dateInterval({ from: "2025-07-01" });
void intervalEnd;
void checkedAmount;
void checkedSum;
void checkedDates;
// @ts-expect-error pure aud requires branded cents.
aud(100);
// @ts-expect-error a fallible constructor is a program, not Money.
const uncheckedAmount: Money = audFromCents(100);
void uncheckedAmount;

const bodyPolicy: typeof CalculatorRequestBodyPolicy.Type = CalculatorRequestBodyPolicy.make({ responseFormat: "html" });
const bodyFailure: typeof CalculatorRequestBodyErrorEnvelope.Type = {error: new CalculatorRequestBodyTooLarge()};
const metadataTimeout: typeof CalculatorMetadataError.Type = new CalculatorOperationTimedOut();
void bodyPolicy;
void bodyFailure;
void metadataTimeout;
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
  taxableIncome: aud(Cents.make(9_000_000)),
});
`
        ),
        fs.writeFileString(
          path.join(workspacePath, "src/runtime.ts"),
          `import { CalculatorRequestBodyErrorEnvelope, CalculatorRequestBodyTooLarge, CalculatorRequestBodyLimit } from "@taxkit/api-http/request-boundary";
import { PublicCalculatorServiceBounded, CalculatorConcurrencyLimit } from "@taxkit/calculators/work";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculationEngineLive } from "@taxkit/core";
import { Cents, DateInterval, InvalidCalendarValue, InvalidMoneyValue, IsoDate, Money, aud, audFromCents, dateInterval, moneyAdd } from "@taxkit/core/primitives";
import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import { RuleId, SourceArtifact, SourceRef, TraceNode } from "@taxkit/core/trace";
import { GrossPay } from "@taxkit/rules-au-pay";
import { CryptoHasher } from "bun";
import { AtoIncomeTaxTable, AtoIncomeTax_2025_26_Live, AtoIncomeTaxTableDescriptor, IncomeTaxTable, IncomeTaxArtifact2025_26, AtoLitoTable, AtoLito_2025_26_Live, AtoLitoTableDescriptor, LitoTable, LitoArtifact2025_26, AtoMedicareLevyTable, AtoMedicareLevy_2025_26_Live, AtoMedicareLevyTableDescriptor, MedicareLevyTable, MedicareLevyArtifact2025_26 } from "@taxkit/rules-au-income-tax/parameters";
import { AtoSchedule1Table, AtoSchedule1_2025_26_Live, AtoSchedule1TableDescriptor, Schedule1Table, Schedule1Artifact2025_26 } from "@taxkit/rules-au-pay/parameters";
import { AtoStslTable, AtoStsl_2025_26_Live, AtoStslTableDescriptor, StslTable, StslArtifact2025_26 } from "@taxkit/rules-au-stsl/parameters";
import { Effect, Layer, Option, Record, Result, Schema } from "effect";
import { TaxKit, TaxKitCalculationError } from "@taxkit/sdk";
import { calculateReport } from "@taxkit/sdk/effect";
import { au } from "@taxkit/sdk/au";

await Effect.runPromise(Effect.gen(function* () {
  const maximum = yield* audFromCents(Number.MAX_SAFE_INTEGER);
  const extra = yield* audFromCents(1);
  const overflow = yield* moneyAdd(maximum, extra).pipe(Effect.result);
  if (!Result.isFailure(overflow)) {
    throw new Error("Packed money overflow did not return a checked failure.");
  }
  const error = yield* Schema.encodeEffect(InvalidMoneyValue)(overflow.failure);
  if (JSON.stringify(error) !== '{"_tag":"InvalidMoneyValue","code":"invalid-money-value","message":"The amount must fit in safe whole AUD cents."}') {
    throw new Error("Packed money failure changed its safe representation.");
  }
  const calendarFailure = yield* dateInterval({from: "private-calendar-sentinel"}).pipe(Effect.result);
  if (!Result.isFailure(calendarFailure)) {
    throw new Error("Packed calendar input did not return a checked failure.");
  }
  const calendarError = yield* Schema.encodeEffect(InvalidCalendarValue)(calendarFailure.failure);
  if (JSON.stringify(calendarError) !== '{"_tag":"InvalidCalendarValue","code":"invalid-calendar-value","message":"The calendar date, interval or tax year is invalid."}') {
    throw new Error("Packed calendar failure included unsupported details.");
  }
  const missing = yield* dateInterval({from: "2025-07-01"});
  const explicitUndefined = yield* dateInterval({from: "2025-07-01", toExclusive: undefined});
  const present = yield* dateInterval({from: "2025-07-01", toExclusive: "2026-07-01"});
  const missingEncoded = yield* Schema.encodeEffect(DateInterval)(missing);
  const undefinedEncoded = yield* Schema.encodeEffect(DateInterval)(explicitUndefined);
  const presentEncoded = yield* Schema.encodeEffect(DateInterval)(present);
  if (Record.has<string, string | undefined>(missingEncoded, "toExclusive") || !Record.has<string, string | undefined>(undefinedEncoded, "toExclusive") || !Option.isNone(missing.toExclusive) || !Option.isSome(explicitUndefined.toExclusive)) {
    throw new Error("Packed date codec lost historical optional-key identity.");
  }
  if (JSON.stringify(missingEncoded) !== '{"from":"2025-07-01"}' || JSON.stringify(undefinedEncoded) !== '{"from":"2025-07-01"}' || JSON.stringify(presentEncoded) !== '{"from":"2025-07-01","toExclusive":"2026-07-01"}') {
    throw new Error("Packed date codec changed historical bytes.");
  }
  const restored = yield* Schema.decodeEffect(DateInterval)(undefinedEncoded);
  const restoredEncoded = yield* Schema.encodeEffect(DateInterval)(restored);
  if (!Record.has<string, string | undefined>(restoredEncoded, "toExclusive")) {
    throw new Error("Packed date codec lost an explicit key during round trip.");
  }
  if (Schema.is(Schema.toEncoded(DateInterval))({from: "2026-07-01", toExclusive: "2026-07-01"})) {
    throw new Error("Packed encoded date codec lost the ordering check.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const income_tax = yield* AtoIncomeTaxTable.pipe(Effect.provide(AtoIncomeTax_2025_26_Live));
  const income_taxEncoded = yield* Schema.encodeEffect(IncomeTaxTable)(income_tax);
  const income_taxPeriod = yield* Schema.encodeEffect(DateInterval)(AtoIncomeTaxTableDescriptor.effectivePeriod);
  const income_taxArtifact = yield* Schema.encodeEffect(SourceArtifact)(IncomeTaxArtifact2025_26);
  if (new CryptoHasher("sha256").update(JSON.stringify(income_taxEncoded)).digest("hex") !== "9258a71a24c9a26dd43466a4940c7140a023ccff846969b1247a59ddd2e16aad") {
    throw new Error("Packed income-tax table changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(income_taxPeriod)).digest("hex") !== "c09939f95d9a46e34e1e56be898a5d4b504e19412dd9b4215ef39335b2b19a25") {
    throw new Error("Packed income-tax period changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(income_taxArtifact)).digest("hex") !== "39297168ce7bad1fed76c32eae48841eaeebb71f32a479c63c472e0d66204c90") {
    throw new Error("Packed income-tax artifact changed historical bytes.");
  }
  const income_taxInvalid = yield* IncomeTaxTable.makeEffect({...income_tax, brackets: []}).pipe(Effect.result);
  const income_taxDecoded = yield* Schema.decodeEffect(IncomeTaxTable)({...income_taxEncoded, brackets: []}).pipe(Effect.result);
  const income_taxRepresentation = yield* Schema.decodeEffect(Schema.toEncoded(IncomeTaxTable))({...income_taxEncoded, brackets: []}).pipe(Effect.result);
  if (!Result.isFailure(income_taxInvalid) || !Result.isFailure(income_taxDecoded) || !Result.isFailure(income_taxRepresentation)) {
    throw new Error("Packed income-tax table admitted missing coverage.");
  }
  const lito = yield* AtoLitoTable.pipe(Effect.provide(AtoLito_2025_26_Live));
  const litoEncoded = yield* Schema.encodeEffect(LitoTable)(lito);
  const litoPeriod = yield* Schema.encodeEffect(DateInterval)(AtoLitoTableDescriptor.effectivePeriod);
  const litoArtifact = yield* Schema.encodeEffect(SourceArtifact)(LitoArtifact2025_26);
  if (new CryptoHasher("sha256").update(JSON.stringify(litoEncoded)).digest("hex") !== "5c6a5944cf83fea770c887e4fedc5da7d7c6bb1540c885232692a83e701eb872") {
    throw new Error("Packed lito table changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(litoPeriod)).digest("hex") !== "c09939f95d9a46e34e1e56be898a5d4b504e19412dd9b4215ef39335b2b19a25") {
    throw new Error("Packed lito period changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(litoArtifact)).digest("hex") !== "1c9681f9ac534e9a8fe638f01b7f09f18955b60a3a019858085aa373aefe6002") {
    throw new Error("Packed lito artifact changed historical bytes.");
  }
  const litoInvalid = yield* LitoTable.makeEffect({...lito, brackets: []}).pipe(Effect.result);
  const litoDecoded = yield* Schema.decodeEffect(LitoTable)({...litoEncoded, brackets: []}).pipe(Effect.result);
  const litoRepresentation = yield* Schema.decodeEffect(Schema.toEncoded(LitoTable))({...litoEncoded, brackets: []}).pipe(Effect.result);
  if (!Result.isFailure(litoInvalid) || !Result.isFailure(litoDecoded) || !Result.isFailure(litoRepresentation)) {
    throw new Error("Packed lito table admitted missing coverage.");
  }
  const medicare_levy = yield* AtoMedicareLevyTable.pipe(Effect.provide(AtoMedicareLevy_2025_26_Live));
  const medicare_levyEncoded = yield* Schema.encodeEffect(MedicareLevyTable)(medicare_levy);
  const medicare_levyPeriod = yield* Schema.encodeEffect(DateInterval)(AtoMedicareLevyTableDescriptor.effectivePeriod);
  const medicare_levyArtifact = yield* Schema.encodeEffect(SourceArtifact)(MedicareLevyArtifact2025_26);
  if (new CryptoHasher("sha256").update(JSON.stringify(medicare_levyEncoded)).digest("hex") !== "a4c9271a2d82c7f403ca1819f59937c21e036bf0da978c45c250051b4a856cf8") {
    throw new Error("Packed medicare-levy table changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(medicare_levyPeriod)).digest("hex") !== "c09939f95d9a46e34e1e56be898a5d4b504e19412dd9b4215ef39335b2b19a25") {
    throw new Error("Packed medicare-levy period changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(medicare_levyArtifact)).digest("hex") !== "502caaaebe081be3b6abbc7dedf20daccf66acaa060089e017ff3dbf498d23e2") {
    throw new Error("Packed medicare-levy artifact changed historical bytes.");
  }
  const medicare_levyInvalid = yield* MedicareLevyTable.makeEffect({...medicare_levy, shadeInMaxCents: medicare_levy.thresholdCents}).pipe(Effect.result);
  const medicare_levyDecoded = yield* Schema.decodeEffect(MedicareLevyTable)({...medicare_levyEncoded, shadeInMaxCents: medicare_levyEncoded.thresholdCents}).pipe(Effect.result);
  const medicare_levyRepresentation = yield* Schema.decodeEffect(Schema.toEncoded(MedicareLevyTable))({...medicare_levyEncoded, shadeInMaxCents: medicare_levyEncoded.thresholdCents}).pipe(Effect.result);
  if (!Result.isFailure(medicare_levyInvalid) || !Result.isFailure(medicare_levyDecoded) || !Result.isFailure(medicare_levyRepresentation)) {
    throw new Error("Packed Medicare table admitted invalid threshold order.");
  }
  const schedule1 = yield* AtoSchedule1Table.pipe(Effect.provide(AtoSchedule1_2025_26_Live));
  const schedule1Encoded = yield* Schema.encodeEffect(Schedule1Table)(schedule1);
  const schedule1Period = yield* Schema.encodeEffect(DateInterval)(AtoSchedule1TableDescriptor.effectivePeriod);
  const schedule1Artifact = yield* Schema.encodeEffect(SourceArtifact)(Schedule1Artifact2025_26);
  if (new CryptoHasher("sha256").update(JSON.stringify(schedule1Encoded)).digest("hex") !== "b0799054e0f0f792b3aad2ba0571f88f6aeee8f100eb02cdca96fc81c33ce645") {
    throw new Error("Packed schedule1 table changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(schedule1Period)).digest("hex") !== "c09939f95d9a46e34e1e56be898a5d4b504e19412dd9b4215ef39335b2b19a25") {
    throw new Error("Packed schedule1 period changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(schedule1Artifact)).digest("hex") !== "e6cc36f12b35c22c206f9f4e7b0aadee5cc5752f399c88569ac3590d871cbc34") {
    throw new Error("Packed schedule1 artifact changed historical bytes.");
  }
  const schedule1Invalid = yield* Schedule1Table.makeEffect({...schedule1, rows: []}).pipe(Effect.result);
  const schedule1Decoded = yield* Schema.decodeEffect(Schedule1Table)({...schedule1Encoded, rows: []}).pipe(Effect.result);
  const schedule1Representation = yield* Schema.decodeEffect(Schema.toEncoded(Schedule1Table))({...schedule1Encoded, rows: []}).pipe(Effect.result);
  if (!Result.isFailure(schedule1Invalid) || !Result.isFailure(schedule1Decoded) || !Result.isFailure(schedule1Representation)) {
    throw new Error("Packed schedule1 table admitted missing coverage.");
  }
  const stsl = yield* AtoStslTable.pipe(Effect.provide(AtoStsl_2025_26_Live));
  const stslEncoded = yield* Schema.encodeEffect(StslTable)(stsl);
  const stslPeriod = yield* Schema.encodeEffect(DateInterval)(AtoStslTableDescriptor.effectivePeriod);
  const stslArtifact = yield* Schema.encodeEffect(SourceArtifact)(StslArtifact2025_26);
  if (new CryptoHasher("sha256").update(JSON.stringify(stslEncoded)).digest("hex") !== "ca94be8c2b5818381824d4a4f100789a35794312c5a00984ea1e83a8bfc366fe") {
    throw new Error("Packed stsl table changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(stslPeriod)).digest("hex") !== "ce72cb303a5db02f62aefe810e606ce988084bb990b0153cbd3b1d89ae186e36") {
    throw new Error("Packed stsl period changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(stslArtifact)).digest("hex") !== "4981834012bdbb02e22b0aab02e7fb2208cd80e81c400b1bf01147a2b8f6135b") {
    throw new Error("Packed stsl artifact changed historical bytes.");
  }
  const stslInvalid = yield* StslTable.makeEffect({...stsl, rows: []}).pipe(Effect.result);
  const stslDecoded = yield* Schema.decodeEffect(StslTable)({...stslEncoded, rows: []}).pipe(Effect.result);
  const stslRepresentation = yield* Schema.decodeEffect(Schema.toEncoded(StslTable))({...stslEncoded, rows: []}).pipe(Effect.result);
  if (!Result.isFailure(stslInvalid) || !Result.isFailure(stslDecoded) || !Result.isFailure(stslRepresentation)) {
    throw new Error("Packed stsl table admitted missing coverage.");
  }
}));

const fixtureSource = SourceRef.make({kind: "internal-validation", reference: "historical-codec-fixture", title: "Compatibility fixture"});
const fixtureChild = TraceNode.make({children: [], inputs: {cents: 165_400}, result: 165_400, ruleId: RuleId.make("fixture/child"), sources: [fixtureSource], title: "Child"});
const fixtureParent = TraceNode.make({children: [fixtureChild], formula: "result = input", inputs: {amount: 165_400}, result: 165_400, rounding: "round-to-nearest-cent", ruleId: RuleId.make("fixture/parent"), sources: [fixtureSource], title: "Parent"});
const fixtureUndefined = TraceNode.make({...fixtureChild, formula: undefined, rounding: undefined});
const fixtureLedger = LedgerComponent.make({amount: aud(Cents.make(165_400)), effect: "additive", id: ComponentId.make("fixture/component"), label: "Fixture", status: "active", trace: fixtureParent});
const encodedMissing = await Effect.runPromise(Schema.encodeEffect(TraceNode)(fixtureChild));
if (JSON.stringify(encodedMissing) !== '{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/child","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Child"}') {
  throw new Error("Packed core missing encoding changed historical bytes.");
}
if (Object.hasOwn(encodedMissing, "formula") || Object.hasOwn(encodedMissing, "rounding")) {
  throw new Error("Packed core trace introduced absent historical keys.");
}
const restoredMissing = await Effect.runPromise(Schema.decodeUnknownEffect(TraceNode)(encodedMissing));
const reencodedMissing = await Effect.runPromise(Schema.encodeEffect(TraceNode)(restoredMissing));
if (JSON.stringify(reencodedMissing) !== '{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/child","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Child"}') {
  throw new Error("Packed core missing codec round trip changed historical bytes.");
}
const encodedPresent = await Effect.runPromise(Schema.encodeEffect(TraceNode)(fixtureParent));
if (JSON.stringify(encodedPresent) !== '{"_tag":"TraceNode","children":[{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/child","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Child"}],"formula":"result = input","inputs":{"amount":165400},"result":165400,"rounding":"round-to-nearest-cent","ruleId":"fixture/parent","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Parent"}') {
  throw new Error("Packed core present encoding changed historical bytes.");
}
const restoredPresent = await Effect.runPromise(Schema.decodeUnknownEffect(TraceNode)(encodedPresent));
const reencodedPresent = await Effect.runPromise(Schema.encodeEffect(TraceNode)(restoredPresent));
if (JSON.stringify(reencodedPresent) !== '{"_tag":"TraceNode","children":[{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/child","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Child"}],"formula":"result = input","inputs":{"amount":165400},"result":165400,"rounding":"round-to-nearest-cent","ruleId":"fixture/parent","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Parent"}') {
  throw new Error("Packed core present codec round trip changed historical bytes.");
}
const encodedUndefined = await Effect.runPromise(Schema.encodeEffect(TraceNode)(fixtureUndefined));
if (JSON.stringify(encodedUndefined) !== '{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/child","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Child"}') {
  throw new Error("Packed core explicit-undefined encoding changed historical bytes.");
}
if (!Object.hasOwn(encodedUndefined, "formula") || !Object.hasOwn(encodedUndefined, "rounding")) {
  throw new Error("Packed core trace lost explicitly undefined historical keys.");
}
const restoredUndefined = await Effect.runPromise(Schema.decodeUnknownEffect(TraceNode)(encodedUndefined));
const reencodedUndefined = await Effect.runPromise(Schema.encodeEffect(TraceNode)(restoredUndefined));
if (JSON.stringify(reencodedUndefined) !== '{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/child","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Child"}') {
  throw new Error("Packed core explicit-undefined codec round trip changed historical bytes.");
}
const encodedLedger = await Effect.runPromise(Schema.encodeEffect(LedgerComponent)(fixtureLedger));
if (JSON.stringify(encodedLedger) !== '{"_tag":"LedgerComponent","amount":{"_tag":"Money","cents":165400,"currency":"AUD"},"effect":"additive","id":"fixture/component","label":"Fixture","status":"active","trace":{"_tag":"TraceNode","children":[{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/child","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Child"}],"formula":"result = input","inputs":{"amount":165400},"result":165400,"rounding":"round-to-nearest-cent","ruleId":"fixture/parent","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Parent"}}') {
  throw new Error("Packed core ledger encoding changed historical bytes.");
}
const restoredLedger = await Effect.runPromise(Schema.decodeUnknownEffect(LedgerComponent)(encodedLedger));
const reencodedLedger = await Effect.runPromise(Schema.encodeEffect(LedgerComponent)(restoredLedger));
if (JSON.stringify(reencodedLedger) !== '{"_tag":"LedgerComponent","amount":{"_tag":"Money","cents":165400,"currency":"AUD"},"effect":"additive","id":"fixture/component","label":"Fixture","status":"active","trace":{"_tag":"TraceNode","children":[{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/child","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Child"}],"formula":"result = input","inputs":{"amount":165400},"result":165400,"rounding":"round-to-nearest-cent","ruleId":"fixture/parent","sources":[{"_tag":"SourceRef","kind":"internal-validation","reference":"historical-codec-fixture","title":"Compatibility fixture"}],"title":"Parent"}}') {
  throw new Error("Packed core ledger codec round trip changed historical bytes.");
}

if (Schema.is(TraceNode)({...fixtureChild, inputs: {callback: () => "unsafe fixture"}}) || Schema.is(TraceNode)({...fixtureChild, result: () => "unsafe fixture"})) {
  throw new Error("Packed core trace admitted a non-JSON value.");
}
if (Schema.is(Schema.toEncoded(LedgerComponent))({...encodedLedger, amount: {...encodedLedger.amount, currency: "USD"}})) {
  throw new Error("Packed core ledger lost the canonical Money currency check.");
}

const requestFailure = new CalculatorRequestBodyTooLarge();
if (!Schema.is(CalculatorRequestBodyErrorEnvelope)({error: requestFailure}) || requestFailure.code !== "request-too-large" || CalculatorRequestBodyLimit !== 65_536n) {
  throw new Error("Packed HTTP request-body contract is not available.");
}
const ServiceLive = PublicCalculatorServiceBounded.pipe(
  Layer.provide(PublicCalculatorServiceLive),
  Layer.provide(CalculationEngineLive)
);
if (CalculatorConcurrencyLimit !== 8) {
  throw new Error("Packed calculation policy has the wrong capacity.");
}
const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: aud(Cents.make(165_400)),
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
  taxableIncome: aud(Cents.make(9_000_000)),
});
const effectAnnualReport = await Effect.runPromise(
  calculateReport(au.calculations.annualIncomeTax, {
    taxableIncome: aud(Cents.make(9_000_000)),
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
const clientAnnual = await client.calculations.calculate(au.calculations.annualIncomeTax, { taxableIncome: aud(Cents.make(9_000_000)) });
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
