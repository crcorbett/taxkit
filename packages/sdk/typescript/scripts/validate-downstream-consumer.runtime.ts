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
          `import * as MetadataSchemas from "@taxkit/calculators/schemas";
import { CalculationError } from "@taxkit/core/errors";
import { listCalculatorCatalogEntries } from "@taxkit/calculators/catalog";
import type { CalculatorCatalogEntry } from "@taxkit/calculators/catalog";
import { CalculatorRequestBodyPolicy, CalculatorRequestBodyTooLarge, CalculatorRequestBodyErrorEnvelope } from "@taxkit/api-http/request-boundary";
import { PublicCalculatorServiceBounded } from "@taxkit/calculators/work";
import type { LedgerComponent, LedgerComponentEncoded } from "@taxkit/core/ledger";
import { RuleId, SourceRef, TraceNode } from "@taxkit/core/trace";
import type { TraceNodeEncoded } from "@taxkit/core/trace";
import type { CalculationInput } from "@taxkit/sdk";
import { Context, Layer, Option, Schema } from "effect";
import { Effect } from "effect";
import { makeFactDescriptor } from "@taxkit/core/facts";
import { makeRuleDescriptor } from "@taxkit/core/rules";
import { makeParameterDescriptor } from "@taxkit/core/parameters";
import { TaxKit, TaxKitCalculationError } from "@taxkit/sdk";
import { calculateReport } from "@taxkit/sdk/effect";
import { au } from "@taxkit/sdk/au";
import { auEffect } from "@taxkit/sdk/au/effect";
import {
  CalculatorRunRequest,
  CalculatorServiceError,
  CalculatorCapacityExceeded,
  CalculatorRateLimited,
  CalculatorAdmissionUnavailable,
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


const diagnostic = new CalculationError({message: "Fixed fixture failure"});
const diagnosticCause: Option.Option<Option.Option<unknown>> = diagnostic.cause;
void diagnosticCause;
// @ts-expect-error diagnostic absence must use the canonical Option Type.
new CalculationError({message: "Fixed fixture failure", cause: null});
declare const catalogueEntry: CalculatorCatalogEntry;
// @ts-expect-error the catalogue exposes a checked continuation, not an erased program.
catalogueEntry.program;
void listCalculatorCatalogEntries;

const traceMakeInput = {children: [], inputs: {}, result: 1, ruleId: RuleId.make("fixture/type"), sources: [], title: "Fixture"};
const requestDefaults = MetadataSchemas.CalculationQuery.make({});
const checkedHelp: Option.Option<Option.Option<typeof MetadataSchemas.HelpMode.Type>> = requestDefaults.help;
void checkedHelp;
const checkedContext = MetadataSchemas.MetadataQuery.make({});
const jurisdiction: Option.Option<Option.Option<typeof MetadataSchemas.CalculatorJurisdiction.Type>> = checkedContext.jurisdiction;
void jurisdiction;
// @ts-expect-error constructor inputs use canonical Options, not wire strings.
MetadataSchemas.MetadataQuery.make({jurisdiction: "AU"});
// @ts-expect-error constructor help uses canonical Options, not a wire string.
MetadataSchemas.CalculationQuery.make({help: "full"});
// @ts-expect-error nullable context is not an admitted request representation.
MetadataSchemas.MetadataQuery.make({taxYear: null});
// @ts-expect-error false permission must still be wrapped in its owning Option.
MetadataSchemas.RuleDescriptorMetadata.make({id: RuleId.make("fixture/rule"), parameters: [], provides: [], requires: [], sourcePolicy: "not-required", sources: [], title: "Fixture", allowDuplicateProvides: false});
const checkedTrace = TraceNode.make(traceMakeInput);
const traceFormula: Option.Option<Option.Option<string>> = checkedTrace.formula;
void traceFormula;
// @ts-expect-error ordinary fields remain checked by the constructor.
TraceNode.make({...traceMakeInput, title: 123});
// @ts-expect-error rule identity must be branded.
TraceNode.make({...traceMakeInput, ruleId: "fixture/type"});
// @ts-expect-error a present formula needs its checked Option representation.
TraceNode.make({...traceMakeInput, formula: "input + value"});
// @ts-expect-error recursive children retain their constructor field requirements.
TraceNode.make({...traceMakeInput, children: [{wrongField: true}]});
class PackedFact extends Context.Service<PackedFact, number>()("fixture/PackedFact") {}
class PackedInput extends Context.Service<PackedInput, string>()("fixture/PackedInput") {}
const packedFact = makeFactDescriptor({authority: "derived", id: "fixture/number", schema: Schema.Number, tag: PackedFact, title: "Number"});
const packedInput = makeFactDescriptor({authority: "input", id: "fixture/string", schema: Schema.String, tag: PackedInput, title: "String"});
declare const packedLayer: Layer.Layer<PackedFact, never, PackedInput>;
const packedRule = makeRuleDescriptor({id: RuleId.make("fixture/rule"), layer: packedLayer, provides: [packedFact], requires: [packedInput], sources: [], sourcePolicy: "not-required", title: "Fixture"});
const preservedLayer: Layer.Layer<PackedFact, never, PackedInput> = packedRule.layer;
void preservedLayer;
// @ts-expect-error a Layer cannot substitute a different required service.
const wrongLayer: Layer.Layer<PackedFact, never, PackedFact> = packedRule.layer;
void wrongLayer;

class PackedParameter extends Context.Service<PackedParameter, boolean>()("fixture/PackedParameter") {}
declare const packedPeriod: DateInterval;
const packedParameter = makeParameterDescriptor({effectivePeriod: packedPeriod, id: "fixture/parameter", schema: Schema.Boolean, source: SourceRef.make({kind: "internal-validation", reference: "fixture", title: "Fixture"}), tag: PackedParameter, title: "Flag"});
declare const packedParameterizedLayer: Layer.Layer<PackedFact, never, PackedInput | PackedParameter>;
const packedParameterizedRule = makeRuleDescriptor({id: RuleId.make("fixture/parameterized-rule"), layer: packedParameterizedLayer, parameters: [packedParameter], provides: [packedFact], requires: [packedInput], sources: [], sourcePolicy: "not-required", title: "Fixture"});
const preservedParameterizedLayer: Layer.Layer<PackedFact, never, PackedInput | PackedParameter> = packedParameterizedRule.layer;
void preservedParameterizedLayer;
// @ts-expect-error the parameter service remains part of the required inputs.
const omittedParameterLayer: Layer.Layer<PackedFact, never, PackedInput> = packedParameterizedRule.layer;
void omittedParameterLayer;

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
const rateFailure: typeof CalculatorServiceError.Type = new CalculatorRateLimited();
const admissionFailure: typeof CalculatorServiceError.Type = new CalculatorAdmissionUnavailable();
// @ts-expect-error A native provider cause cannot be supplied as public rate guidance.
new CalculatorRateLimited({ cause: "PRIVATE9" });
// @ts-expect-error Connection identity is not part of checked unavailable guidance.
admissionFailure.key;
void rateFailure;
void admissionFailure;
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
import { PublicCalculatorService } from "@taxkit/calculators/service";
import * as MetadataSchemas from "@taxkit/calculators/schemas";
import { CalculationError } from "@taxkit/core/errors";
import { listCalculatorCatalogEntries } from "@taxkit/calculators/catalog";
import { CalculationEngineLive } from "@taxkit/core";
import { Cents, DateInterval, InvalidCalendarValue, InvalidMoneyValue, IsoDate, Money, aud, audFromCents, dateInterval, moneyAdd } from "@taxkit/core/primitives";
import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import { FactQuestion, FactQuestionId } from "@taxkit/core/facts";
import { RuleId, SourceArtifact, SourceRef, TraceNode } from "@taxkit/core/trace";
import { GrossPay } from "@taxkit/rules-au-pay";
import { CryptoHasher } from "bun";
import { AtoIncomeTaxTable, AtoIncomeTax_2025_26_Live, AtoIncomeTaxTableDescriptor, IncomeTaxTable, IncomeTaxArtifact2025_26, AtoLitoTable, AtoLito_2025_26_Live, AtoLitoTableDescriptor, LitoTable, LitoArtifact2025_26, AtoMedicareLevyTable, AtoMedicareLevy_2025_26_Live, AtoMedicareLevyTableDescriptor, MedicareLevyTable, MedicareLevyArtifact2025_26 } from "@taxkit/rules-au-income-tax/parameters";
import { AtoSchedule1Table, AtoSchedule1_2025_26_Live, AtoSchedule1TableDescriptor, Schedule1Table, Schedule1Artifact2025_26 } from "@taxkit/rules-au-pay/parameters";
import { AtoStslTable, AtoStsl_2025_26_Live, AtoStslTableDescriptor, StslTable, StslArtifact2025_26 } from "@taxkit/rules-au-stsl/parameters";
import { Array as EffectArray, Effect, Layer, Option, Record, Result, Schema } from "effect";
import { TaxKit, TaxKitCalculationError } from "@taxkit/sdk";
import { calculateReport } from "@taxkit/sdk/effect";
import { au } from "@taxkit/sdk/au";

await Effect.runPromise(Effect.gen(function* () {
// Original Core diagnostic forms saved before this owner migration.
{
  const value = yield* Schema.decodeEffect(CalculationError)({_tag:"CalculationError",message:"Fixed fixture failure"});
  const encoded = yield* Schema.encodeEffect(CalculationError)(value);
  const again = yield* Schema.decodeEffect(CalculationError)(encoded).pipe(Effect.flatMap(Schema.encodeEffect(CalculationError)));
  if (!Option.isOption(value.cause) || new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "2e1c0c478792264b776ee67af4514dff1019029d35df4ac40654114c959a50ca" || JSON.stringify(Record.keys<string, unknown>(encoded)) !== JSON.stringify(["_tag", "message"]) || JSON.stringify(Record.keys<string, unknown>(again)) !== JSON.stringify(["_tag", "message"]) || JSON.stringify(encoded) !== JSON.stringify(again)) {
    throw new Error("Packed Core diagnostic changed its original missing form.");
  }
}
{
  const value = yield* Schema.decodeEffect(CalculationError)({_tag:"CalculationError",message:"Fixed fixture failure",cause:undefined});
  const encoded = yield* Schema.encodeEffect(CalculationError)(value);
  const again = yield* Schema.decodeEffect(CalculationError)(encoded).pipe(Effect.flatMap(Schema.encodeEffect(CalculationError)));
  if (!Option.isOption(value.cause) || new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "2e1c0c478792264b776ee67af4514dff1019029d35df4ac40654114c959a50ca" || JSON.stringify(Record.keys<string, unknown>(encoded)) !== JSON.stringify(["_tag", "cause", "message"]) || JSON.stringify(Record.keys<string, unknown>(again)) !== JSON.stringify(["_tag", "cause", "message"]) || JSON.stringify(encoded) !== JSON.stringify(again)) {
    throw new Error("Packed Core diagnostic changed its original undefined form.");
  }
}
{
  const value = yield* Schema.decodeEffect(CalculationError)({_tag:"CalculationError",message:"Fixed fixture failure",cause:null});
  const encoded = yield* Schema.encodeEffect(CalculationError)(value);
  const again = yield* Schema.decodeEffect(CalculationError)(encoded).pipe(Effect.flatMap(Schema.encodeEffect(CalculationError)));
  if (!Option.isOption(value.cause) || new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "14a23939f06cb0db51383619118d28a5b2184b4a1eca43fb896278f1080ffbf5" || JSON.stringify(Record.keys<string, unknown>(encoded)) !== JSON.stringify(["_tag", "cause", "message"]) || JSON.stringify(Record.keys<string, unknown>(again)) !== JSON.stringify(["_tag", "cause", "message"]) || JSON.stringify(encoded) !== JSON.stringify(again)) {
    throw new Error("Packed Core diagnostic changed its original null form.");
  }
}
{
  const value = yield* Schema.decodeEffect(CalculationError)({_tag:"CalculationError",message:"Fixed fixture failure",cause:{fixture:"safe-representative"}});
  const encoded = yield* Schema.encodeEffect(CalculationError)(value);
  const again = yield* Schema.decodeEffect(CalculationError)(encoded).pipe(Effect.flatMap(Schema.encodeEffect(CalculationError)));
  if (!Option.isOption(value.cause) || new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "1b27955d885f1b09d98591a96be676e13810572a1b639cdf91d4dd99ab7170f7" || JSON.stringify(Record.keys<string, unknown>(encoded)) !== JSON.stringify(["_tag", "cause", "message"]) || JSON.stringify(Record.keys<string, unknown>(again)) !== JSON.stringify(["_tag", "cause", "message"]) || JSON.stringify(encoded) !== JSON.stringify(again)) {
    throw new Error("Packed Core diagnostic changed its original object form.");
  }
}
const defaultError = new CalculationError({message:"Fixed fixture failure"});
if (!Option.isNone(defaultError.cause) || listCalculatorCatalogEntries().some(entry => EffectArray.contains<string>(Record.keys(entry), "program"))) {
  throw new Error("Packed domain contract lost defaults or retained its unused program escape.");
}

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

// Saved before the public request migration; expectations come from the original owners.

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.MetadataQuery)({});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.MetadataQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.MetadataQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.MetadataQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== false || Object.hasOwn(encoded, "taxYear") !== false) {
    throw new Error("Packed MetadataQuery/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.MetadataQuery)({jurisdiction: undefined, taxYear: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.MetadataQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.MetadataQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.MetadataQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true) {
    throw new Error("Packed MetadataQuery/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.MetadataQuery)({jurisdiction: "AU", taxYear: "2025-26"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.MetadataQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.MetadataQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.MetadataQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "f45bea6dfdddf63af51736fca999756a1780f4b31d33495026c5c7fa88fbd5a0" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true) {
    throw new Error("Packed MetadataQuery/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.HelpQuery)({});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.HelpQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.HelpQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.HelpQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== false || Object.hasOwn(encoded, "taxYear") !== false || Object.hasOwn(encoded, "help") !== false) {
    throw new Error("Packed HelpQuery/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.HelpQuery)({jurisdiction: undefined, taxYear: undefined, help: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.HelpQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.HelpQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.HelpQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true || Object.hasOwn(encoded, "help") !== true) {
    throw new Error("Packed HelpQuery/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.HelpQuery)({jurisdiction: "AU", taxYear: "2025-26", help: "full"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.HelpQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.HelpQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.HelpQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "0be5bb97e742b21e1526e138ac2b85eb2cf971e1355aa0862e6941a8331adc67" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true || Object.hasOwn(encoded, "help") !== true) {
    throw new Error("Packed HelpQuery/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculationQuery)({});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculationQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculationQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculationQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "help") !== false) {
    throw new Error("Packed CalculationQuery/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculationQuery)({help: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculationQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculationQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculationQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "help") !== true) {
    throw new Error("Packed CalculationQuery/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculationQuery)({help: "full"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculationQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculationQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculationQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "da39084a2e387010419681fabd9733b9183dc0130300ab37e2ea99b897dec05d" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "help") !== true) {
    throw new Error("Packed CalculationQuery/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorRequest)({calculatorId: "au.income-tax.annual"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "fe30bae8d21838d1abfdfef6ede97337602421dca17a2f875f9f8d74f2993d23" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== false || Object.hasOwn(encoded, "taxYear") !== false || Object.hasOwn(encoded, "help") !== false) {
    throw new Error("Packed GetCalculatorRequest/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorRequest)({calculatorId: "au.income-tax.annual", jurisdiction: undefined, taxYear: undefined, help: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "fe30bae8d21838d1abfdfef6ede97337602421dca17a2f875f9f8d74f2993d23" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true || Object.hasOwn(encoded, "help") !== true) {
    throw new Error("Packed GetCalculatorRequest/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorRequest)({calculatorId: "au.income-tax.annual", jurisdiction: "AU", taxYear: "2025-26", help: "full"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "37671de06f163469dc22e3558fe7057a8e8f205ff728a287108fe999a7ebab9f" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true || Object.hasOwn(encoded, "help") !== true) {
    throw new Error("Packed GetCalculatorRequest/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorGraphRequest)({calculatorId: "au.income-tax.annual"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorGraphRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorGraphRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorGraphRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "fe30bae8d21838d1abfdfef6ede97337602421dca17a2f875f9f8d74f2993d23" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== false || Object.hasOwn(encoded, "taxYear") !== false) {
    throw new Error("Packed GetCalculatorGraphRequest/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorGraphRequest)({calculatorId: "au.income-tax.annual", jurisdiction: undefined, taxYear: undefined, help: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorGraphRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorGraphRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorGraphRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "fe30bae8d21838d1abfdfef6ede97337602421dca17a2f875f9f8d74f2993d23" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true) {
    throw new Error("Packed GetCalculatorGraphRequest/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorGraphRequest)({calculatorId: "au.income-tax.annual", jurisdiction: "AU", taxYear: "2025-26", help: "full"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorGraphRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.GetCalculatorGraphRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.GetCalculatorGraphRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "65fe06057e41885252e7a2b092290de8b7c5cec8b075f9e6247d528c4d7551d0" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true) {
    throw new Error("Packed GetCalculatorGraphRequest/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.DescriptorFilterQuery)({});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.DescriptorFilterQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.DescriptorFilterQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.DescriptorFilterQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "calculator") !== false || Object.hasOwn(encoded, "jurisdiction") !== false || Object.hasOwn(encoded, "taxYear") !== false) {
    throw new Error("Packed DescriptorFilterQuery/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.DescriptorFilterQuery)({calculator: undefined, jurisdiction: undefined, taxYear: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.DescriptorFilterQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.DescriptorFilterQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.DescriptorFilterQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "calculator") !== true || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true) {
    throw new Error("Packed DescriptorFilterQuery/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.DescriptorFilterQuery)({calculator: "au.income-tax.annual", jurisdiction: "AU", taxYear: "2025-26"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.DescriptorFilterQuery)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.DescriptorFilterQuery)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.DescriptorFilterQuery)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "adccd61014613c74da5bd5fa3b0dd8ac7452ae2cf0e1273cba6b34b6c364feda" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "calculator") !== true || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true) {
    throw new Error("Packed DescriptorFilterQuery/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunRequest)({facts: {taxableIncome: {_tag: "Money", cents: 9000000, currency: "AUD"}}});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "b0c6614005ab660bdb736bf10fefd1643b57bf5c784e2e3c4f0318ab2d579617" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== false || Object.hasOwn(encoded, "taxYear") !== false) {
    throw new Error("Packed CalculatorRunRequest/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunRequest)({facts: {taxableIncome: {_tag: "Money", cents: 9000000, currency: "AUD"}}, jurisdiction: undefined, taxYear: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "b0c6614005ab660bdb736bf10fefd1643b57bf5c784e2e3c4f0318ab2d579617" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true) {
    throw new Error("Packed CalculatorRunRequest/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunRequest)({facts: {taxableIncome: {_tag: "Money", cents: 9000000, currency: "AUD"}}, jurisdiction: "AU", taxYear: "2025-26"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "bec0ecf461d79d2524f0c4d3590c8f49095883d58fb64e6cba3bd18ac83df44f" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "jurisdiction") !== true || Object.hasOwn(encoded, "taxYear") !== true) {
    throw new Error("Packed CalculatorRunRequest/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunServiceRequest)({calculatorId: "au.income-tax.annual", payload: {facts: {taxableIncome: {_tag: "Money", cents: 9000000, currency: "AUD"}}}});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunServiceRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunServiceRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunServiceRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "7d4cebb87770da5f461a30a47178e63eeb23b1e7bfece6c31631e412849114cb" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "help") !== false) {
    throw new Error("Packed CalculatorRunServiceRequest/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunServiceRequest)({calculatorId: "au.income-tax.annual", payload: {facts: {taxableIncome: {_tag: "Money", cents: 9000000, currency: "AUD"}}}, help: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunServiceRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunServiceRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunServiceRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "7d4cebb87770da5f461a30a47178e63eeb23b1e7bfece6c31631e412849114cb" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "help") !== true) {
    throw new Error("Packed CalculatorRunServiceRequest/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunServiceRequest)({calculatorId: "au.income-tax.annual", payload: {facts: {taxableIncome: {_tag: "Money", cents: 9000000, currency: "AUD"}}}, help: "full"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunServiceRequest)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunServiceRequest)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunServiceRequest)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "58c6a32c45ba03810fb7f864c7d0882d3072625130480b49d8021bcd038d71f1" || JSON.stringify(encoded) !== JSON.stringify(again) || Object.hasOwn(encoded, "help") !== true) {
    throw new Error("Packed CalculatorRunServiceRequest/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputHelp)({"factId": "fixture/fact", "title": "Fixture"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputHelp)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputHelp)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputHelp)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "934afe89da88e80a9eabe058b7899d7698407a6c6842cf76ef010ec5393652bf" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["factId", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["factId", "title"])) {
    throw new Error("Packed CalculatorInputHelp/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.FactDescriptorMetadata)({"authority": "input", "id": "fixture/fact", "schemaTag": "Money", "title": "Fixture"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.FactDescriptorMetadata)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.FactDescriptorMetadata)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.FactDescriptorMetadata)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "91d29898239c61f2b3c9198263a2c39540d137430009da982b97e648d6b0824a" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["authority", "id", "schemaTag", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["authority", "id", "schemaTag", "title"])) {
    throw new Error("Packed FactDescriptorMetadata/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.UnsupportedCalculatorContextError)({"_tag": "UnsupportedCalculatorContextError", "context": {}, "message": "Unsupported test context", "requestedCalculator": "au.income-tax.annual"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.UnsupportedCalculatorContextError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.UnsupportedCalculatorContextError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.UnsupportedCalculatorContextError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "913960bc8e0e08c568c9150db526d4ef8c03bc10720a56fa9f82a5cdc7d417d0" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "context", "message", "requestedCalculator"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "context", "message", "requestedCalculator"])) {
    throw new Error("Packed UnsupportedCalculatorContextError/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputHelp)({"factId": "fixture/fact", "title": "Fixture", question: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputHelp)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputHelp)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputHelp)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "934afe89da88e80a9eabe058b7899d7698407a6c6842cf76ef010ec5393652bf" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["factId", "question", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["factId", "question", "title"])) {
    throw new Error("Packed CalculatorInputHelp/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.FactDescriptorMetadata)({"authority": "input", "id": "fixture/fact", "schemaTag": "Money", "title": "Fixture", question: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.FactDescriptorMetadata)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.FactDescriptorMetadata)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.FactDescriptorMetadata)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "91d29898239c61f2b3c9198263a2c39540d137430009da982b97e648d6b0824a" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["authority", "id", "question", "schemaTag", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["authority", "id", "question", "schemaTag", "title"])) {
    throw new Error("Packed FactDescriptorMetadata/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.UnsupportedCalculatorContextError)({"_tag": "UnsupportedCalculatorContextError", "context": {"jurisdiction": undefined, "taxYear": undefined}, "message": "Unsupported test context", "requestedCalculator": "au.income-tax.annual"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.UnsupportedCalculatorContextError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.UnsupportedCalculatorContextError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.UnsupportedCalculatorContextError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "913960bc8e0e08c568c9150db526d4ef8c03bc10720a56fa9f82a5cdc7d417d0" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "context", "message", "requestedCalculator"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "context", "message", "requestedCalculator"])) {
    throw new Error("Packed UnsupportedCalculatorContextError/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputHelp)({"factId": "fixture/fact", "question": {"_tag": "FactQuestion", "id": "fixture/question", "inputKind": "money", "prompt": "Enter an amount"}, "title": "Fixture"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputHelp)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputHelp)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputHelp)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "7efaeb721955f48f3c3986cfbc0243bc2919146997e172b0c4681bbf108432b7" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["factId", "question", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["factId", "question", "title"])) {
    throw new Error("Packed CalculatorInputHelp/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.FactDescriptorMetadata)({"authority": "input", "id": "fixture/fact", "question": {"_tag": "FactQuestion", "id": "fixture/question", "inputKind": "money", "prompt": "Enter an amount"}, "schemaTag": "Money", "title": "Fixture"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.FactDescriptorMetadata)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.FactDescriptorMetadata)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.FactDescriptorMetadata)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "a4aea7f78123263173a29ba84f804b8b0b02f00192aee676e80627c18622bcb7" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["authority", "id", "question", "schemaTag", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["authority", "id", "question", "schemaTag", "title"])) {
    throw new Error("Packed FactDescriptorMetadata/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.UnsupportedCalculatorContextError)({"_tag": "UnsupportedCalculatorContextError", "context": {"jurisdiction": "AU", "taxYear": "2025-26"}, "message": "Unsupported test context", "requestedCalculator": "au.income-tax.annual"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.UnsupportedCalculatorContextError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.UnsupportedCalculatorContextError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.UnsupportedCalculatorContextError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "0363af54d90b1906faa9b64a27f256113bbf1fda2f067496eef8f16b4894f46b" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "context", "message", "requestedCalculator"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "context", "message", "requestedCalculator"])) {
    throw new Error("Packed UnsupportedCalculatorContextError/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.RuleDescriptorMetadata)({"id": "fixture/rule", "parameters": [], "provides": [], "requires": [], "sourcePolicy": "not-required", "sources": [], "title": "Fixture"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.RuleDescriptorMetadata)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.RuleDescriptorMetadata)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.RuleDescriptorMetadata)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "1ec96367697bf2207c370ea47470dbb3db075dd7c3f82d771b5ecccfc1292705" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["id", "parameters", "provides", "requires", "sourcePolicy", "sources", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["id", "parameters", "provides", "requires", "sourcePolicy", "sources", "title"])) {
    throw new Error("Packed RuleDescriptorMetadata/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.RuleDescriptorMetadata)({"id": "fixture/rule", "parameters": [], "provides": [], "requires": [], "sourcePolicy": "not-required", "sources": [], "title": "Fixture", allowDuplicateProvides: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.RuleDescriptorMetadata)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.RuleDescriptorMetadata)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.RuleDescriptorMetadata)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "1ec96367697bf2207c370ea47470dbb3db075dd7c3f82d771b5ecccfc1292705" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["allowDuplicateProvides", "id", "parameters", "provides", "requires", "sourcePolicy", "sources", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["allowDuplicateProvides", "id", "parameters", "provides", "requires", "sourcePolicy", "sources", "title"])) {
    throw new Error("Packed RuleDescriptorMetadata/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.RuleDescriptorMetadata)({"allowDuplicateProvides": false, "id": "fixture/rule", "parameters": [], "provides": [], "requires": [], "sourcePolicy": "not-required", "sources": [], "title": "Fixture"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.RuleDescriptorMetadata)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.RuleDescriptorMetadata)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.RuleDescriptorMetadata)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "65a273a5cb1041e950715e738da2e774ee675e458b7ac558c3e62216a362d288" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["allowDuplicateProvides", "id", "parameters", "provides", "requires", "sourcePolicy", "sources", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["allowDuplicateProvides", "id", "parameters", "provides", "requires", "sourcePolicy", "sources", "title"])) {
    throw new Error("Packed RuleDescriptorMetadata/false changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.RuleDescriptorMetadata)({"allowDuplicateProvides": true, "id": "fixture/rule", "parameters": [], "provides": [], "requires": [], "sourcePolicy": "not-required", "sources": [], "title": "Fixture"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.RuleDescriptorMetadata)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.RuleDescriptorMetadata)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.RuleDescriptorMetadata)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "3edbef562b82856cbf24da6e552d116e641143b1ee8f7d21f88749bcab4352e5" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["allowDuplicateProvides", "id", "parameters", "provides", "requires", "sourcePolicy", "sources", "title"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["allowDuplicateProvides", "id", "parameters", "provides", "requires", "sourcePolicy", "sources", "title"])) {
    throw new Error("Packed RuleDescriptorMetadata/true changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)({"_tag": "CalculatorInputDecodeError", "issues": [], "message": "Invalid fixture input"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "a407a6d8d3d76bbeb4fca1bd016d7aeaa93e6a688715077583380d60b95a1ec3" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "issues", "message"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "issues", "message"])) {
    throw new Error("Packed CalculatorInputDecodeError/missing/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)({"_tag": "CalculatorInputDecodeError", "issues": [], "message": "Invalid fixture input", help: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "a407a6d8d3d76bbeb4fca1bd016d7aeaa93e6a688715077583380d60b95a1ec3" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "help", "issues", "message"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "help", "issues", "message"])) {
    throw new Error("Packed CalculatorInputDecodeError/missing/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)({"_tag": "CalculatorInputDecodeError", "help": [{"factId": "fixture/fact", "question": {"_tag": "FactQuestion", "id": "fixture/question", "inputKind": "money", "prompt": "Enter an amount"}, "title": "Fixture"}], "issues": [], "message": "Invalid fixture input"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "3053782fc254bd270aa71aa13c2fda25f13570163998614a76e9f3e820d36281" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "help", "issues", "message"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "help", "issues", "message"])) {
    throw new Error("Packed CalculatorInputDecodeError/missing/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)({"_tag": "CalculatorInputDecodeError", "issues": [], "message": "Invalid fixture input", calculatorId: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "a407a6d8d3d76bbeb4fca1bd016d7aeaa93e6a688715077583380d60b95a1ec3" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "calculatorId", "issues", "message"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "calculatorId", "issues", "message"])) {
    throw new Error("Packed CalculatorInputDecodeError/undefined/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)({"_tag": "CalculatorInputDecodeError", "issues": [], "message": "Invalid fixture input", calculatorId: undefined, help: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "a407a6d8d3d76bbeb4fca1bd016d7aeaa93e6a688715077583380d60b95a1ec3" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "calculatorId", "help", "issues", "message"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "calculatorId", "help", "issues", "message"])) {
    throw new Error("Packed CalculatorInputDecodeError/undefined/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)({"_tag": "CalculatorInputDecodeError", "help": [{"factId": "fixture/fact", "question": {"_tag": "FactQuestion", "id": "fixture/question", "inputKind": "money", "prompt": "Enter an amount"}, "title": "Fixture"}], "issues": [], "message": "Invalid fixture input", calculatorId: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "3053782fc254bd270aa71aa13c2fda25f13570163998614a76e9f3e820d36281" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "calculatorId", "help", "issues", "message"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "calculatorId", "help", "issues", "message"])) {
    throw new Error("Packed CalculatorInputDecodeError/undefined/present changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)({"_tag": "CalculatorInputDecodeError", "calculatorId": "au.income-tax.annual", "issues": [], "message": "Invalid fixture input"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "c02eb42d05fe7e4c5fdb4821fa6079388c6a0ff890f40f9f038eb7350dafe587" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "calculatorId", "issues", "message"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "calculatorId", "issues", "message"])) {
    throw new Error("Packed CalculatorInputDecodeError/present/missing changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)({"_tag": "CalculatorInputDecodeError", "calculatorId": "au.income-tax.annual", "issues": [], "message": "Invalid fixture input", help: undefined});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "c02eb42d05fe7e4c5fdb4821fa6079388c6a0ff890f40f9f038eb7350dafe587" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "calculatorId", "help", "issues", "message"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "calculatorId", "help", "issues", "message"])) {
    throw new Error("Packed CalculatorInputDecodeError/present/undefined changed historical bytes or key identity.");
  }
}));

await Effect.runPromise(Effect.gen(function* () {
  const value = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)({"_tag": "CalculatorInputDecodeError", "calculatorId": "au.income-tax.annual", "help": [{"factId": "fixture/fact", "question": {"_tag": "FactQuestion", "id": "fixture/question", "inputKind": "money", "prompt": "Enter an amount"}, "title": "Fixture"}], "issues": [], "message": "Invalid fixture input"});
  const encoded = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(value);
  const restored = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorInputDecodeError)(encoded);
  const again = yield* Schema.encodeEffect(MetadataSchemas.CalculatorInputDecodeError)(restored);
  if (new CryptoHasher("sha256").update(JSON.stringify(encoded)).digest("hex") !== "7426d620c184e3969b2becabc3d87b7157c61631988d8301d9a8e3725a4d64aa" || JSON.stringify(encoded) !== JSON.stringify(again) || JSON.stringify(Object.keys(encoded)) !== JSON.stringify(["_tag", "calculatorId", "help", "issues", "message"]) || JSON.stringify(Object.keys(again)) !== JSON.stringify(["_tag", "calculatorId", "help", "issues", "message"])) {
    throw new Error("Packed CalculatorInputDecodeError/present/present changed historical bytes or key identity.");
  }
}));

const fixtureSource = SourceRef.make({kind: "internal-validation", reference: "historical-codec-fixture", title: "Compatibility fixture"});
const questionBase = {id: FactQuestionId.make("fixture/absence"), inputKind: "money", prompt: "Enter an amount"} as const;
const questionSamples = [
  {value: new FactQuestion(questionBase), own: false, bytes: '{"_tag":"FactQuestion","id":"fixture/absence","inputKind":"money","prompt":"Enter an amount"}'},
  {value: new FactQuestion({...questionBase, helpText: Option.some(Option.none())}), own: true, bytes: '{"_tag":"FactQuestion","id":"fixture/absence","inputKind":"money","prompt":"Enter an amount"}'},
  {value: new FactQuestion({...questionBase, helpText: Option.some(Option.some("Checked text"))}), own: true, bytes: '{"_tag":"FactQuestion","helpText":"Checked text","id":"fixture/absence","inputKind":"money","prompt":"Enter an amount"}'},
];
await Effect.runPromise(Effect.forEach(questionSamples, (sample) => Effect.gen(function* () {
  const encoded = yield* Schema.encodeEffect(FactQuestion)(sample.value);
  const restored = yield* Schema.decodeEffect(FactQuestion)(encoded);
  const again = yield* Schema.encodeEffect(FactQuestion)(restored);
  if (JSON.stringify(encoded) !== sample.bytes || JSON.stringify(again) !== sample.bytes || Object.hasOwn(encoded, "helpText") !== sample.own || Object.hasOwn(again, "helpText") !== sample.own) {
    throw new Error("Packed question codec changed historical key identity or bytes.");
  }
})));
const fixtureChild = TraceNode.make({children: [], inputs: {cents: 165_400}, result: 165_400, ruleId: RuleId.make("fixture/child"), sources: [fixtureSource], title: "Child"});
const fixtureParent = TraceNode.make({children: [fixtureChild], formula: Option.some(Option.some("result = input")), inputs: {amount: 165_400}, result: 165_400, rounding: Option.some(Option.some("round-to-nearest-cent")), ruleId: RuleId.make("fixture/parent"), sources: [fixtureSource], title: "Parent"});
const fixtureUndefined = TraceNode.make({...fixtureChild, formula: Option.some(Option.none()), rounding: Option.some(Option.none())});
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

// Original calculator report and error bytes, saved before public request changes.
const historicalRuns = [
  {
    "name": "report/au.income-tax.annual/missing/missing",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/missing/missing",
    "sha256": "e821140e6a43c53d73488b29b3a25a7435c50f74b0319bfe8655ce410bd4739c",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/missing/undefined",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/missing/undefined",
    "sha256": "e821140e6a43c53d73488b29b3a25a7435c50f74b0319bfe8655ce410bd4739c",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/missing/errors",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/missing/errors",
    "sha256": "3dbd6896001bec9bb9d6974a7ed86bf79a4a7becffc5f2bd370daf21875ad722",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/missing/full",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/missing/full",
    "sha256": "3dbd6896001bec9bb9d6974a7ed86bf79a4a7becffc5f2bd370daf21875ad722",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/undefined/missing",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/undefined/missing",
    "sha256": "e821140e6a43c53d73488b29b3a25a7435c50f74b0319bfe8655ce410bd4739c",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/undefined/undefined",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/undefined/undefined",
    "sha256": "e821140e6a43c53d73488b29b3a25a7435c50f74b0319bfe8655ce410bd4739c",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/undefined/errors",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/undefined/errors",
    "sha256": "3dbd6896001bec9bb9d6974a7ed86bf79a4a7becffc5f2bd370daf21875ad722",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/undefined/full",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/undefined/full",
    "sha256": "3dbd6896001bec9bb9d6974a7ed86bf79a4a7becffc5f2bd370daf21875ad722",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/present/missing",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/present/missing",
    "sha256": "e821140e6a43c53d73488b29b3a25a7435c50f74b0319bfe8655ce410bd4739c",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/present/undefined",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/present/undefined",
    "sha256": "e821140e6a43c53d73488b29b3a25a7435c50f74b0319bfe8655ce410bd4739c",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/present/errors",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/present/errors",
    "sha256": "3dbd6896001bec9bb9d6974a7ed86bf79a4a7becffc5f2bd370daf21875ad722",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.income-tax.annual/present/full",
    "sha256": "d92a416c9b99f24a096a5500026e32d021bccf6a40048ab4a86b8b1a29b403c8",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.income-tax.annual/present/full",
    "sha256": "3dbd6896001bec9bb9d6974a7ed86bf79a4a7becffc5f2bd370daf21875ad722",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/missing/missing",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/missing/missing",
    "sha256": "0455d2e018ae5cd5c9b5eba756bfbce90629dfef9ce180641c9096b2a6702f39",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/missing/undefined",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/missing/undefined",
    "sha256": "0455d2e018ae5cd5c9b5eba756bfbce90629dfef9ce180641c9096b2a6702f39",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/missing/errors",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/missing/errors",
    "sha256": "2e5c6c606880e01d85549480cf84666dee71709c8a87c2e9a213df6cf2bd333b",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/missing/full",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/missing/full",
    "sha256": "2e5c6c606880e01d85549480cf84666dee71709c8a87c2e9a213df6cf2bd333b",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/undefined/missing",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/undefined/missing",
    "sha256": "0455d2e018ae5cd5c9b5eba756bfbce90629dfef9ce180641c9096b2a6702f39",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/undefined/undefined",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/undefined/undefined",
    "sha256": "0455d2e018ae5cd5c9b5eba756bfbce90629dfef9ce180641c9096b2a6702f39",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/undefined/errors",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/undefined/errors",
    "sha256": "2e5c6c606880e01d85549480cf84666dee71709c8a87c2e9a213df6cf2bd333b",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/undefined/full",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/undefined/full",
    "sha256": "2e5c6c606880e01d85549480cf84666dee71709c8a87c2e9a213df6cf2bd333b",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/present/missing",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/present/missing",
    "sha256": "0455d2e018ae5cd5c9b5eba756bfbce90629dfef9ce180641c9096b2a6702f39",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/present/undefined",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/present/undefined",
    "sha256": "0455d2e018ae5cd5c9b5eba756bfbce90629dfef9ce180641c9096b2a6702f39",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/present/errors",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/present/errors",
    "sha256": "2e5c6c606880e01d85549480cf84666dee71709c8a87c2e9a213df6cf2bd333b",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.take-home/present/full",
    "sha256": "df45dbf1b7c6f5b71970a7ba6cf3e2a72000d317bd96734e59a3687f8f62850d",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.take-home/present/full",
    "sha256": "2e5c6c606880e01d85549480cf84666dee71709c8a87c2e9a213df6cf2bd333b",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/missing/missing",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/missing/missing",
    "sha256": "3bb456d60e5891df14d700a0cd6ef0c0d7cc4d3eb4439433fea29784f9e7d4e1",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/missing/undefined",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/missing/undefined",
    "sha256": "3bb456d60e5891df14d700a0cd6ef0c0d7cc4d3eb4439433fea29784f9e7d4e1",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/missing/errors",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/missing/errors",
    "sha256": "1aa2b4d425bcc917a32e837e0fa4358484ba984c174fc36550d310ccabaf7f32",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/missing/full",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/missing/full",
    "sha256": "1aa2b4d425bcc917a32e837e0fa4358484ba984c174fc36550d310ccabaf7f32",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/undefined/missing",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/undefined/missing",
    "sha256": "3bb456d60e5891df14d700a0cd6ef0c0d7cc4d3eb4439433fea29784f9e7d4e1",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/undefined/undefined",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/undefined/undefined",
    "sha256": "3bb456d60e5891df14d700a0cd6ef0c0d7cc4d3eb4439433fea29784f9e7d4e1",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/undefined/errors",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/undefined/errors",
    "sha256": "1aa2b4d425bcc917a32e837e0fa4358484ba984c174fc36550d310ccabaf7f32",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/undefined/full",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/undefined/full",
    "sha256": "1aa2b4d425bcc917a32e837e0fa4358484ba984c174fc36550d310ccabaf7f32",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/present/missing",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/present/missing",
    "sha256": "3bb456d60e5891df14d700a0cd6ef0c0d7cc4d3eb4439433fea29784f9e7d4e1",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/present/undefined",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/present/undefined",
    "sha256": "3bb456d60e5891df14d700a0cd6ef0c0d7cc4d3eb4439433fea29784f9e7d4e1",
    "keys": [
      "_tag",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/present/errors",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/present/errors",
    "sha256": "1aa2b4d425bcc917a32e837e0fa4358484ba984c174fc36550d310ccabaf7f32",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  },
  {
    "name": "report/au.pay.withholdings/present/full",
    "sha256": "6e0a3ce751e28ac92543563e8cdf9de4082a853ee90ea1a5c8afd6577a6e30ad",
    "keys": [
      "calculator",
      "diagnostics",
      "report"
    ]
  },
  {
    "name": "error/au.pay.withholdings/present/full",
    "sha256": "1aa2b4d425bcc917a32e837e0fa4358484ba984c174fc36550d310ccabaf7f32",
    "keys": [
      "_tag",
      "calculatorId",
      "help",
      "issues",
      "message"
    ]
  }
];
await Effect.runPromise(Effect.gen(function* () {
  const service = yield* PublicCalculatorService;
  for (const calculatorId of ["au.income-tax.annual", "au.pay.take-home", "au.pay.withholdings"] as const)
  for (const contextForm of ["missing", "undefined", "present"] as const)
  for (const helpForm of ["missing", "undefined", "errors", "full"] as const) {
    const context = contextForm === "missing" ? {} : contextForm === "undefined" ? {jurisdiction: undefined, taxYear: undefined} : {jurisdiction: "AU", taxYear: "2025-26"};
    const help = helpForm === "missing" ? {} : {help: helpForm === "undefined" ? undefined : helpForm};
    const facts = calculatorId === "au.income-tax.annual" ? {taxableIncome: {_tag: "Money", cents: 9000000, currency: "AUD"}} : {grossPay: {_tag: "GrossPay", amount: {_tag: "Money", cents: 346200, currency: "AUD"}, period: "fortnightly"}, taxFreeThresholdClaimed: true};
    const request = yield* Schema.decodeUnknownEffect(MetadataSchemas.CalculatorRunServiceRequest)({calculatorId, ...help, payload: {facts, ...context}});
    const report = yield* service.calculate(request);
    const encodedReport = yield* Schema.encodeEffect(MetadataSchemas.CalculatorRunResponse)(report);
    // @ts-expect-error invalid external facts deliberately bypass the Type to qualify safe selected-calculator errors.
    const error = yield* service.calculate({...request, payload: {...request.payload, facts: {privateSource: "private-fixed-sentinel"}}}).pipe(Effect.flip);
    const encodedError = yield* Schema.encodeEffect(MetadataSchemas.CalculatorServiceError)(error);
    const suffix = calculatorId + "/" + contextForm + "/" + helpForm;
    for (const sample of [{name: "report/" + suffix, value: encodedReport}, {name: "error/" + suffix, value: encodedError}]) {
      const prior = historicalRuns.find((row) => row.name === sample.name);
      const bytes = JSON.stringify(sample.value);
      if (!prior || new CryptoHasher("sha256").update(bytes).digest("hex") !== prior.sha256 || JSON.stringify(Object.keys(sample.value)) !== JSON.stringify(prior.keys) || bytes.includes("private-fixed-sentinel")) {
        throw new Error("Packed calculator changed original result or safe error bytes: " + sample.name);
      }
    }
  }
}).pipe(Effect.provide(ServiceLive)));

// Saved before the domain absence migration. Never regenerate these expectations from the candidate.
const historicalMetadataResponses = [
  {
    "name": "listCalculators/missing",
    "sha256": "6e200f212e679b62fa58877df8bae5f537aa22b6fc7996547faae4e883f21edf"
  },
  {
    "name": "listTaxYears/missing",
    "sha256": "620a9e823c74ff266ce38ff560eb09a31048ff1382b1e744aada0b49e440ae81"
  },
  {
    "name": "listFacts/missing",
    "sha256": "305b21ede52932c1c0ea9387819711fa05a5efac1e089e9c98b1acdf974ea730"
  },
  {
    "name": "listRules/missing",
    "sha256": "77f7351f528043060b3996fa20c2cb0e6f189908818479e91c3c5597e79997a3"
  },
  {
    "name": "listCalculators/undefined",
    "sha256": "6e200f212e679b62fa58877df8bae5f537aa22b6fc7996547faae4e883f21edf"
  },
  {
    "name": "listTaxYears/undefined",
    "sha256": "620a9e823c74ff266ce38ff560eb09a31048ff1382b1e744aada0b49e440ae81"
  },
  {
    "name": "listFacts/undefined",
    "sha256": "305b21ede52932c1c0ea9387819711fa05a5efac1e089e9c98b1acdf974ea730"
  },
  {
    "name": "listRules/undefined",
    "sha256": "77f7351f528043060b3996fa20c2cb0e6f189908818479e91c3c5597e79997a3"
  },
  {
    "name": "listCalculators/present",
    "sha256": "6e200f212e679b62fa58877df8bae5f537aa22b6fc7996547faae4e883f21edf"
  },
  {
    "name": "listTaxYears/present",
    "sha256": "620a9e823c74ff266ce38ff560eb09a31048ff1382b1e744aada0b49e440ae81"
  },
  {
    "name": "listFacts/present",
    "sha256": "305b21ede52932c1c0ea9387819711fa05a5efac1e089e9c98b1acdf974ea730"
  },
  {
    "name": "listRules/present",
    "sha256": "77f7351f528043060b3996fa20c2cb0e6f189908818479e91c3c5597e79997a3"
  },
  {
    "name": "listJurisdictions",
    "sha256": "e9233758a746baf68f5838dcbfc1e6d789117dbbe5af2ebf7a0b7f4eb5d13d0b"
  },
  {
    "name": "getCalculator/au.income-tax.annual",
    "sha256": "61d982b8efe98aa551fdb83880b0d447460a70f10c066b2b57e2c12978864e6d"
  },
  {
    "name": "getCalculatorSchema/au.income-tax.annual",
    "sha256": "81da58b15dc6b354d5fb75371cb8164c6288dfc7843c07e8ef5c9a08b0b9f691"
  },
  {
    "name": "getCalculatorGraph/au.income-tax.annual",
    "sha256": "22ab7c276d183c4c8caa196a5a74df7f88f91f5887dbefb288955647d1121a1e"
  },
  {
    "name": "getCalculator/au.pay.take-home",
    "sha256": "cbc540e189918ca9a24e6b336d4a6fded7f6d8023014bb05ef158061ed621f5b"
  },
  {
    "name": "getCalculatorSchema/au.pay.take-home",
    "sha256": "c3eac30389f6336c1f29c91ef3fc88221f19970a228c2df61850b1f2b4fd4b75"
  },
  {
    "name": "getCalculatorGraph/au.pay.take-home",
    "sha256": "5d9362ac324909440e4f401a9d557a2a03b54e8e19f5555bf72cc59d193fe0e6"
  },
  {
    "name": "getCalculator/au.pay.withholdings",
    "sha256": "8ce477da37e564900c2e775f413c4ec17afefc6c86675d9511e90235e2d70c86"
  },
  {
    "name": "getCalculatorSchema/au.pay.withholdings",
    "sha256": "2f148ef2589d7dabd9e202d871080dc3e7d25c3955ebcb8d6989b1c4bea3d6f1"
  },
  {
    "name": "getCalculatorGraph/au.pay.withholdings",
    "sha256": "ed25422a9681dec33092ee1d18fb26a59c6a98a825570a24b1e2875f2b15dfdb"
  }
];
const assertHistoricalMetadataResponse = (name: string, bytes: string) => {
  const expected = historicalMetadataResponses.find((sample) => sample.name === name);
  if (!expected || new CryptoHasher("sha256").update(bytes).digest("hex") !== expected.sha256) {
    throw new Error("Packed metadata response changed saved bytes: " + name);
  }
};
await Effect.runPromise(Effect.gen(function* () {
  const service = yield* PublicCalculatorService;
  for (const form of ["missing", "undefined", "present"] as const) {
    const context = form === "missing" ? {} : form === "undefined" ? {jurisdiction: undefined, taxYear: undefined} : {jurisdiction: "AU", taxYear: "2025-26"} as const;
    const query = yield* Schema.decodeEffect(MetadataSchemas.MetadataQuery)(context);
    const filter = yield* Schema.decodeEffect(MetadataSchemas.DescriptorFilterQuery)(context);
    const calculators = yield* service.listCalculators(query);
    const years = yield* service.listTaxYears(query);
    const facts = yield* service.listFacts(filter);
    const rules = yield* service.listRules(filter);
    assertHistoricalMetadataResponse("listCalculators/" + form, JSON.stringify(yield* Schema.encodeEffect(MetadataSchemas.CalculatorCatalogResponse)(calculators)));
    assertHistoricalMetadataResponse("listTaxYears/" + form, JSON.stringify(yield* Schema.encodeEffect(MetadataSchemas.TaxYearsResponse)(years)));
    assertHistoricalMetadataResponse("listFacts/" + form, JSON.stringify(yield* Schema.encodeEffect(MetadataSchemas.FactsResponse)(facts)));
    assertHistoricalMetadataResponse("listRules/" + form, JSON.stringify(yield* Schema.encodeEffect(MetadataSchemas.RulesResponse)(rules)));
  }
  assertHistoricalMetadataResponse("listJurisdictions", JSON.stringify(yield* service.listJurisdictions().pipe(Effect.flatMap((value) => Schema.encodeEffect(MetadataSchemas.JurisdictionsResponse)(value)))));
  for (const calculatorId of ["au.income-tax.annual", "au.pay.take-home", "au.pay.withholdings"] as const) {
    const input = {calculatorId, jurisdiction: "AU", taxYear: "2025-26"} as const;
    const request = yield* Schema.decodeEffect(MetadataSchemas.GetCalculatorRequest)(input);
    const graphRequest = yield* Schema.decodeEffect(MetadataSchemas.GetCalculatorGraphRequest)(input);
    const calculator = yield* service.getCalculator(request);
    const schema = yield* service.getCalculatorSchema(request);
    const graph = yield* service.getCalculatorGraph(graphRequest);
    assertHistoricalMetadataResponse("getCalculator/" + calculatorId, JSON.stringify(yield* Schema.encodeEffect(MetadataSchemas.CalculatorCatalogItem)(calculator)));
    assertHistoricalMetadataResponse("getCalculatorSchema/" + calculatorId, JSON.stringify(yield* Schema.encodeEffect(MetadataSchemas.CalculatorSchemaResponse)(schema)));
    assertHistoricalMetadataResponse("getCalculatorGraph/" + calculatorId, JSON.stringify(yield* Schema.encodeEffect(MetadataSchemas.CalculatorGraphResponse)(graph)));
  }
}).pipe(Effect.provide(ServiceLive)));

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
