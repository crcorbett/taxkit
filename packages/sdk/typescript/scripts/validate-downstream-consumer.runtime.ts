import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Function as EffectFunction,
  Array as EffectArray,
  Console,
  Effect,
  HashSet,
  Match,
  Option,
  Record as EffectRecord,
  Schema,
  Stream,
  Boolean as EffectBoolean,
} from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ChildProcess } from "effect/process";

import {
  DependencyRecord,
  DependencySectionName,
  PackedPackageManifest,
  RootPackageManifest,
} from "../src/internal/artifact-schemas.js";

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
class DownstreamCommandError extends Schema.TaggedError<
  DownstreamCommandError,
  {
    readonly brand: unique symbol;
  }
>()("DownstreamCommandError", {
  exitCode: Schema.Option(Schema.Finite),
  reason: Schema.Literals(["start-or-read", "exit", "output-limit"]),
  stage: Schema.String,
}) {}
class DownstreamReleaseBlockerError extends Schema.TaggedError<
  DownstreamReleaseBlockerError,
  {
    readonly brand: unique symbol;
  }
>()("DownstreamReleaseBlockerError", {
  evidence: DownstreamValidationEvidence,
}) {}
class DownstreamValidationError extends Schema.TaggedError<
  DownstreamValidationError,
  {
    readonly brand: unique symbol;
  }
>()("DownstreamValidationError", { message: Schema.String }) {}
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
    packageName: "taxkit",
    relativeRoot: "packages/sdk/typescript",
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
              EffectBoolean.match(bytes > 1_048_576, {
                onFalse: () => Effect.succeed(chunk),
                onTrue: () =>
                  Effect.fail(
                    new DownstreamCommandError({
                      exitCode: Option.none(),
                      reason: "output-limit",
                      stage: label,
                    })
                  ),
              })
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
  EffectFunction.pipe(
    EffectRecord.toEntries(manifest.exports),
    EffectArray.flatMap(([subpath, target]) =>
      Match.value(target).pipe(
        Match.when(Schema.is(Schema.String), () => []),
        Match.orElse((matchedValue) =>
          matchedValue.default.pipe(
            Option.filter((defaultTarget) => defaultTarget.endsWith(".js")),
            Option.match({
              onNone: () => [],
              onSome: () => [
                Match.value(subpath).pipe(
                  Match.when(".", () => manifest.name),
                  Match.orElse(
                    (entrypoint) => `${manifest.name}${entrypoint.slice(1)}`
                  )
                ),
              ],
            })
          )
        )
      )
    )
  );
const packedSurfaceFailures = (
  manifest: PackedPackageManifest,
  packedFiles: readonly string[]
) => {
  const packedFileSet = HashSet.fromIterable(packedFiles);
  const exportFailures = EffectFunction.pipe(
    EffectRecord.toEntries(manifest.exports),
    EffectArray.flatMap(([subpath, target]) => {
      const targetFailures = Match.value(target).pipe(
        Match.when(Schema.is(Schema.String), (targetValue) =>
          EffectBoolean.match(
            HashSet.has(
              packedFileSet,
              `package/${targetValue.replace(/^\.\//u, "")}`
            ),
            {
              onFalse: () => [
                `${manifest.name} ${subpath} default target ${targetValue} is absent from the tarball.`,
              ],
              onTrue: () => [],
            }
          )
        ),
        Match.orElse((targetValue) =>
          EffectFunction.pipe(
            ["types", "default"] as const,
            EffectArray.flatMap((condition) =>
              EffectRecord.get(targetValue, condition)
                .pipe(Option.flatten)
                .pipe(
                  Option.match({
                    onNone: () => [
                      `${manifest.name} ${subpath} is missing its ${condition} publication target.`,
                    ],
                    onSome: (value) =>
                      EffectBoolean.match(
                        HashSet.has(
                          packedFileSet,
                          `package/${value.replace(/^\.\//u, "")}`
                        ),
                        {
                          onFalse: () => [
                            `${manifest.name} ${subpath} ${condition} target ${value} is absent from the tarball.`,
                          ],
                          onTrue: () => [],
                        }
                      ),
                  })
                )
            )
          )
        )
      );
      const sourceFailures = Match.value(target).pipe(
        Match.when(Schema.is(Schema.String), () => []),
        Match.orElse((matchedValue) =>
          matchedValue.source.pipe(
            Option.match({
              onNone: () => [],
              onSome: (source) => [
                `${manifest.name} ${subpath} exposes source condition ${source} in the packed manifest.`,
              ],
            })
          )
        )
      );
      return EffectArray.appendAll(sourceFailures, targetFailures);
    })
  );
  const sourceFileFailures = EffectFunction.pipe(
    packedFiles,
    EffectArray.flatMap((packedFile) =>
      EffectBoolean.match(packedFile.startsWith("package/src/"), {
        onFalse: () => [],
        onTrue: () => [`${manifest.name} packed source file ${packedFile}.`],
      })
    )
  );
  const declaredFileFailures = EffectFunction.pipe(
    manifest.files,
    EffectArray.flatMap((file) =>
      EffectBoolean.match(file === "src" || file.startsWith("src/"), {
        onFalse: () => [],
        onTrue: () => [`${manifest.name} files includes source path ${file}.`],
      })
    )
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
  EffectFunction.pipe(
    sections,
    EffectArray.flatMap((section) =>
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
              EffectFunction.pipe(
                EffectRecord.toEntries(dependencies),
                EffectArray.flatMap(([dependencyName, range]) =>
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
                )
              ),
          })
        )
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
const writeConsumerFiles = Effect.fnUntraced(function* ({
  fs,
  path,
  workspacePath,
}: {
  readonly fs: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly workspacePath: string;
}) {
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
        `import { calculate, calculateSafe, createClient } from "taxkit";
import { AuPayTakeHomeCalculation, AuAnnualIncomeTaxCalculation, AuPayTakeHomeWithSacrificeCalculation } from "taxkit/au";
import { TakeHomePayReportEncoded, TakeHomeScenarioInputSchema, TakeHomeWithSacrificeScenarioInput, AnnualTaxScenarioInputSchema } from "taxkit/au/schemas";
import { Cents, Money, NonNegativeMoney, fromDecimal, fromCents } from "taxkit/money";
import { calculateReport, TaxKitLive } from "taxkit/effect";
import { Effect, Result, Schema } from "effect";
const amount = NonNegativeMoney.make(Money.fromCents(Cents.make(165_400)));
const scenario = TakeHomeScenarioInputSchema.make({ grossPay: amount, period: "weekly", taxFreeThresholdClaimed: true });
const checked: Result.Result<Money, import("taxkit/money").MoneyError> = fromCents(100);
void checked; void fromDecimal("123.45");
const plain: Promise<typeof AuPayTakeHomeCalculation.outputSchema.Type> = calculate(AuPayTakeHomeCalculation, scenario);
void plain; void calculateSafe(AuPayTakeHomeCalculation, scenario);
const native: Effect.Effect<typeof AuPayTakeHomeCalculation.outputSchema.Type, typeof AuPayTakeHomeCalculation.errorSchema.Type> = calculateReport(AuPayTakeHomeCalculation, scenario).pipe(Effect.provide(TaxKitLive));
void native;
const client = createClient(); void client.calculate(AuPayTakeHomeCalculation, scenario); void client.dispose();
// @ts-expect-error selected calculator and scenario variable stay correlated.
calculate(AuAnnualIncomeTaxCalculation, scenario);
// @ts-expect-error raw money cannot establish checked input.
TakeHomeScenarioInputSchema.make({ grossPay: 123, period: "weekly", taxFreeThresholdClaimed: true });
// @ts-expect-error signed money requires the non-negative refinement.
AnnualTaxScenarioInputSchema.make({ taxableIncome: Money.fromCents(Cents.make(-1)) });
// @ts-expect-error salary sacrifice is required by its scenario.
TakeHomeWithSacrificeScenarioInput.make({ grossPay: amount, period: "weekly", taxFreeThresholdClaimed: true });
// @ts-expect-error required sacrifice cannot disappear by inference.
calculate(AuPayTakeHomeWithSacrificeCalculation, scenario);
// @ts-expect-error old facade has been deleted.
import { TaxKit } from "taxkit";
// @ts-expect-error old module factory has been deleted.
import { defineTaxKitModule } from "taxkit/effect";
// @ts-expect-error old numeric-dollar constructor has been deleted.
import { audDollars } from "taxkit/core";
void TaxKit; void defineTaxKitModule; void audDollars;
`
      ),
      fs.writeFileString(
        path.join(workspacePath, "src/runtime.ts"),
        `import assert from "node:assert/strict";
import { calculate, calculateSafe, createClient, TaxKitError } from "taxkit";
import { AuPayTakeHomeCalculation, AuAnnualIncomeTaxCalculation, AuPayTakeHomeWithSacrificeCalculation } from "taxkit/au";
import { TakeHomePayReportEncoded, TakeHomeScenarioInputSchema, TakeHomeWithSacrificeScenarioInput, AnnualTaxScenarioInputSchema } from "taxkit/au/schemas";
import { Cents, Money, NonNegativeMoney, MoneyFromDecimalString, fromDecimal, fromCents, format, add } from "taxkit/money";
import * as core from "taxkit/core";
import * as sdk from "taxkit";
import * as native from "taxkit/effect";
import { DateInterval, SourceArtifact } from "taxkit/core";
import { CryptoHasher } from "bun";
import { AtoIncomeTaxTable, AtoIncomeTax_2025_26_Live, AtoIncomeTaxTableDescriptor, IncomeTaxTable, IncomeTaxArtifact2025_26, AtoLitoTable, AtoLito_2025_26_Live, AtoLitoTableDescriptor, LitoTable, LitoArtifact2025_26, AtoMedicareLevyTable, AtoMedicareLevy_2025_26_Live, AtoMedicareLevyTableDescriptor, MedicareLevyTable, MedicareLevyArtifact2025_26, AtoSchedule1Table, AtoSchedule1_2025_26_Live, AtoSchedule1TableDescriptor, Schedule1Table, Schedule1Artifact2025_26, AtoStslTable, AtoStsl_2025_26_Live, AtoStslTableDescriptor, StslTable, StslArtifact2025_26 } from "taxkit/au/schemas";
import { Effect, Result, Schema } from "effect";
const amount = NonNegativeMoney.make(Money.fromCents(Cents.make(165_400)));
const scenario = TakeHomeScenarioInputSchema.make({ grossPay: amount, period: "weekly", taxFreeThresholdClaimed: true });
const plain = await calculate(AuPayTakeHomeCalculation, scenario);
const effect = await Effect.runPromise(native.calculateReport(AuPayTakeHomeCalculation, scenario).pipe(Effect.provide(native.TaxKitLive)));
assert.equal(plain.netPay.cents, 130_100); assert.deepEqual(plain, effect);
const standard = Schema.toStandardSchemaV1(AuPayTakeHomeCalculation.inputSchema, {parseOptions: {onExcessProperty: "error", errors: "all"}, leafHook: () => "Invalid input."});
const encodedScenario = await Effect.runPromise(Schema.encodeEffect(AuPayTakeHomeCalculation.inputSchema)(scenario));
const standardValid = await standard["~standard"].validate(encodedScenario);
assert.ok("value" in standardValid);
const standardInvalid = await standard["~standard"].validate({...encodedScenario, salarySacrifice: "private-standard-schema-sentinel"});
assert.ok("issues" in standardInvalid);
assert.ok(!JSON.stringify(standardInvalid).includes("private-standard-schema-sentinel"));
const jsonSchema = Schema.toJsonSchemaDocument(Schema.toCodecJson(Money));
assert.ok(JSON.stringify(jsonSchema).includes('"cents"'));
const result = await calculateSafe(AuPayTakeHomeCalculation, scenario);
assert.equal(result._tag, "Success");
const codec = Schema.toCodecJson(Schema.Result(AuPayTakeHomeCalculation.outputSchema, TaxKitError));
const bytes = await Effect.runPromise(Schema.encodeEffect(codec)(result));
assert.deepEqual(await Effect.runPromise(Schema.decodeEffect(codec)(bytes)), result);
const annual = await calculate(AuAnnualIncomeTaxCalculation, AnnualTaxScenarioInputSchema.make({ taxableIncome: NonNegativeMoney.make(Money.fromCents(Cents.make(9_000_000))) }));
assert.equal(annual.liability.cents, 1_958_800);
const sacrifice = await calculate(AuPayTakeHomeWithSacrificeCalculation, TakeHomeWithSacrificeScenarioInput.make({ ...scenario, salarySacrifice: NonNegativeMoney.make(Money.fromCents(Cents.make(10_000))) }));
assert.equal(sacrifice.grossPay.cents, sacrifice.netPay.cents + sacrifice.salarySacrifice.cents + sacrifice.withholdingsTotal.cents);
for (const cents of [Number.MIN_SAFE_INTEGER, -123, 0, 123, Number.MAX_SAFE_INTEGER]) {
  const money = Money.fromCents(Cents.make(cents));
  assert.deepEqual(Result.getOrThrow(fromDecimal(format(money))), money);
  assert.deepEqual(await Effect.runPromise(Schema.decodeEffect(MoneyFromDecimalString)(format(money))), money);
}
for (const cents of [0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) assert.equal(fromCents(cents)._tag, "Failure");
assert.equal(fromDecimal("1.005")._tag, "Failure");
assert.equal(add(Money.fromCents(Cents.make(Number.MAX_SAFE_INTEGER)), Money.fromCents(Cents.make(1)))._tag, "Failure");
const encoded = await Effect.runPromise(Schema.encodeEffect(AuPayTakeHomeCalculation.inputSchema)(scenario));
const extra = await Effect.runPromise(native.decodeInput(AuPayTakeHomeCalculation, { ...encoded, salarySacrifice: "PRIVATE_SENTINEL" }).pipe(Effect.result));
assert.equal(extra._tag, "Failure");
if (Result.isFailure(extra)) assert.ok(!JSON.stringify(extra.failure).includes("PRIVATE_SENTINEL"));
const reportWire = await Effect.runPromise(Schema.encodeEffect(AuPayTakeHomeCalculation.outputSchema)(plain));
assert.equal(Schema.decodeUnknownResult(AuPayTakeHomeCalculation.outputSchema)({ ...reportWire, netPay: { ...reportWire.netPay, cents: 0 } })._tag, "Failure");
assert.equal(Schema.decodeUnknownResult(TakeHomePayReportEncoded)({ ...reportWire, netPay: { ...reportWire.netPay, cents: 0 } })._tag, "Failure");
const client = createClient();
await client.calculate(AuPayTakeHomeCalculation, scenario); await client[Symbol.asyncDispose](); await client.dispose();
const closed = await client.calculateSafe(AuPayTakeHomeCalculation, scenario);
assert.equal(closed._tag, "Failure");
if (Result.isFailure(closed)) assert.equal(closed.failure._tag, "TaxKitClientDisposedError");
for (const name of ["TaxKit", "TaxKitSuccess", "TaxKitFailure", "TaxKitCalculationError"]) assert.ok(!Object.hasOwn(sdk, name));
for (const name of ["aud", "audDollars", "audFromCents", "moneyAdd", "moneySub"]) assert.ok(!Object.hasOwn(core, name));
for (const name of ["calculateRunRequest", "calculateReportRequest", "defineSdkCalculation", "defineTaxKitModule"]) assert.ok(!Object.hasOwn(native, name));

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
  if (new CryptoHasher("sha256").update(JSON.stringify(medicare_levyEncoded)).digest("hex") !== "52cf30372769214b7fe24fd64bf6c9930d771eb72a59591818964b246f2c0edd") {
    throw new Error("Packed Medicare table differs from the approved 2025-26 correction.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(medicare_levyPeriod)).digest("hex") !== "c09939f95d9a46e34e1e56be898a5d4b504e19412dd9b4215ef39335b2b19a25") {
    throw new Error("Packed medicare-levy period changed historical bytes.");
  }
  if (new CryptoHasher("sha256").update(JSON.stringify(medicare_levyArtifact)).digest("hex") !== "28b2f3f1de4d5ab37d5f6f969b25a1e4667e4091a9edfc0fc1f5f5955f941b16") {
    throw new Error("Packed Medicare artifact differs from the approved enacted source.");
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
console.log("Downstream SDK runtime examples passed.");
`
      ),
      fs.writeFileString(
        path.join(workspacePath, "src/browser-entry.ts"),
        `import { calculate } from "taxkit";
import { takeHomePay } from "taxkit/au";
import { TakeHomeScenarioInputSchema } from "taxkit/au/schemas";
import { fromDecimal } from "taxkit/money";
import { TaxKitApi } from "taxkit/http";
import { calculateReport } from "taxkit/effect";
export const browserSafeEntrypoints = { calculate, takeHomePay, TakeHomeScenarioInputSchema, fromDecimal, TaxKitApi, calculateReport };
`
      ),
    ],
    { concurrency: 1 }
  );
});
const writePublicEntrypointSmoke = Effect.fnUntraced(function* ({
  fs,
  path,
  workspacePath,
  packedPackages,
}: {
  readonly fs: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly workspacePath: string;
  readonly packedPackages: readonly PackedPackageEvidence[];
}) {
  const entrypointsJson = yield* Schema.encodeEffect(
    Schema.fromJsonString(Schema.Array(Schema.String), { space: 2 })
  )(
    EffectFunction.pipe(
      packedPackages,
      EffectArray.flatMap((packedPackage) => packedPackage.publicEntrypoints)
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
const writeConsumerPackageManifest = Effect.fnUntraced(function* ({
  fs,
  path,
  workspacePath,
  catalog,
  packedPackages,
}: {
  readonly fs: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly workspacePath: string;
  readonly catalog: typeof DependencyRecord.Type;
  readonly packedPackages: readonly PackedPackageEvidence[];
}) {
  const effectVersion = yield* catalogVersion(catalog, "effect");
  const typescriptVersion = yield* catalogVersion(catalog, "typescript");
  const bunTypesVersion = yield* catalogVersion(catalog, "@types/bun");
  const taxkitDependencies = EffectRecord.fromEntries(
    EffectFunction.pipe(
      packedPackages,
      EffectArray.map((packedPackage) => [
        packedPackage.packageName,
        `file:./${path.relative(workspacePath, packedPackage.tarballPath)}`,
      ])
    )
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
const packPackage = Effect.fnUntraced(function* ({
  path,
  artifactPath,
  repoRootPath,
  stagingRootPath,
  packageItem,
}: {
  readonly path: Path.Path;
  readonly artifactPath: string;
  readonly repoRootPath: string;
  readonly stagingRootPath: string;
  readonly packageItem: PackageClosureItem;
}) {
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
      EffectFunction.pipe(
        result.stdout.split("\n"),
        EffectArray.filter((packedFile) => packedFile.length > 0)
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
        `${title}:\n${EffectFunction.pipe(
          findings,
          EffectArray.map(
            (finding) =>
              `- ${finding.packageName} ${finding.section}.${finding.dependencyName} = ${finding.range}`
          )
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
        `Packed artifacts:\n${EffectFunction.pipe(
          evidence.packedArtifacts,
          EffectArray.map((artifact) => `- ${artifact}`)
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
      EffectFunction.pipe(
        packageClosure,
        EffectArray.filter((packageItem) => packageItem.build)
      ),
      (packageItem) =>
        runCommand(
          `build ${packageItem.packageName}`,
          "bun",
          ["run", "build", `--filter=${packageItem.packageName}`],
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
    yield* writeConsumerFiles({
      fs,
      path,
      workspacePath,
    });
    const packedPackages = yield* Effect.forEach(
      packageClosure,
      (packageItem) =>
        packPackage({
          path,
          artifactPath,
          repoRootPath,
          stagingRootPath,
          packageItem,
        }),
      { concurrency: 1 }
    );
    yield* writePublicEntrypointSmoke({
      fs,
      path,
      workspacePath,
      packedPackages,
    });
    yield* writeConsumerPackageManifest({
      fs,
      path,
      workspacePath,
      catalog: rootPackageManifest.workspaces.catalog,
      packedPackages,
    });
    const releaseBlockers = EffectFunction.pipe(
      packedPackages,
      EffectArray.flatMap((packedPackage) =>
        dependencyFindingsForSections(
          packedPackage.packageName,
          packedPackage.manifest,
          runtimeDependencySections
        )
      )
    );
    const devDiagnostics = EffectFunction.pipe(
      packedPackages,
      EffectArray.flatMap((packedPackage) =>
        dependencyFindingsForSections(
          packedPackage.packageName,
          packedPackage.manifest,
          devDependencySections
        )
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
      packedArtifacts: EffectFunction.pipe(
        packedPackages,
        EffectArray.map(
          (packedPackage) =>
            `${packedPackage.packageName} ${packedPackage.tarballFile} (${packedPackage.packedFileCount} files)`
        )
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
        "single SDK archive installed through a local file: reference",
      packedArtifacts: EffectFunction.pipe(
        packedPackages,
        EffectArray.map(
          (packedPackage) =>
            `${packedPackage.packageName} ${packedPackage.tarballFile} (${packedPackage.packedFileCount} files)`
        )
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
