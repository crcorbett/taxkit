import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array,
  Console,
  Effect,
  HashMap,
  HashSet,
  Option,
  Match,
  Record,
  Schema,
  Stream,
} from "effect";
import { Command, Flag } from "effect/cli";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { verifyAcceptedSource } from "./catalogue.build.js";
import { inspectDocumentation } from "./policy.js";
import {
  DocumentationCheckError,
  DocumentationReceipt,
  DocumentationRepositoryPath,
  OwnerPolicy,
  PublicPageAcceptanceRecord,
  WorkspacePackageManifest,
} from "./schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);
const ownerPolicyUrl = new URL("owner-policy.json", import.meta.url);
const reportPath = "tmp/docs-policy-report.json";
const receiptLimit = 20;
export const decodePublicPageAcceptanceRecord = Schema.decodeEffect(
  Schema.fromJsonString(PublicPageAcceptanceRecord),
  { onExcessProperty: "error" }
);

const receiptFor = (report: ReturnType<typeof inspectDocumentation>) =>
  new DocumentationReceipt({
    diagnostics: Array.take(report.diagnostics, receiptLimit),
    inspected: report.inspected,
    maintainer: report.maintainer,
    nonClaim:
      "This local mechanical check validates public status and acceptance-record ownership only; it does not establish public availability, publication, deployment, or runtime behaviour.",
    ok: report.diagnostics.length === 0,
    omittedDiagnostics: Math.max(0, report.diagnostics.length - receiptLimit),
    postcondition:
      report.diagnostics.length === 0
        ? "All configured mechanical documentation invariants passed and the full sanitized report was written before this bounded receipt."
        : "Configured mechanical documentation violations remain and the full sanitized report was written before this bounded receipt.",
    public: report.public,
    reportPath,
    violationCount: report.diagnostics.length,
  });

const renderHuman = (receipt: DocumentationReceipt): string =>
  [
    receipt.ok
      ? "Documentation policy passed."
      : "Documentation policy failed.",
    `violations=${receipt.violationCount}; inspected=${receipt.inspected}; maintainer=${receipt.maintainer}; public=${receipt.public}.`,
    ...Array.map(
      receipt.diagnostics,
      (finding) =>
        `${finding.target} [${finding.invariant}] owner=${finding.owner}; repair=${finding.repair}`
    ),
    `omitted=${receipt.omittedDiagnostics}; detail=${receipt.reportPath}.`,
    `nonclaim=${receipt.nonClaim}`,
  ].join("\n");

const encodeReceipt = (receipt: DocumentationReceipt) =>
  Schema.encodeEffect(Schema.fromJsonString(DocumentationReceipt))(
    receipt
  ).pipe(
    Effect.mapError(
      () => new DocumentationCheckError({ operation: "encode-json-receipt" })
    )
  );

export const checkDocumentation = (repositoryRoot: string) =>
  Effect.gen(function* checkDocumentationProgram() {
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const handle = yield* childProcesses.spawn(
      ChildProcess.make(
        "git",
        ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        {
          cwd: repositoryRoot,
          extendEnv: true,
          forceKillAfter: "2 seconds",
          stderr: "pipe",
          stdin: "ignore",
          stdout: "pipe",
        }
      )
    );
    const [stdout, [exitCode]] = yield* Effect.all(
      [
        Stream.runCollect(handle.stdout),
        Effect.zip(handle.exitCode, Stream.runDrain(handle.stderr), {
          concurrent: true,
        }),
      ],
      { concurrency: "unbounded" }
    );
    if (Number(exitCode) !== 0) {
      return yield* new DocumentationCheckError({
        operation: "inventory-cached-and-untracked-files",
      });
    }
    const rawInventory = yield* Effect.try({
      catch: () =>
        new DocumentationCheckError({ operation: "decode-file-inventory" }),
      try: () =>
        new TextDecoder("utf-8", { fatal: true }).decode(
          Uint8Array.from(Array.flatMap(stdout, Array.fromIterable))
        ),
    });
    const inventory = yield* Schema.decodeEffect(
      Schema.Array(DocumentationRepositoryPath)
    )(Array.filter(rawInventory.split("\0"), (entry) => entry.length > 0)).pipe(
      Effect.mapError(
        () =>
          new DocumentationCheckError({ operation: "decode-file-inventory" })
      )
    );
    const files = yield* Effect.forEach(
      inventory,
      (relativePath) =>
        fileSystem.readFileString(path.join(repositoryRoot, relativePath)).pipe(
          Effect.map((text) => ({ path: relativePath, text })),
          Effect.catchTag("PlatformError", () =>
            Effect.succeed({ path: relativePath, text: "" })
          )
        ),
      { concurrency: 16 }
    );
    const ownerPolicyPath = yield* path
      .fromFileUrl(ownerPolicyUrl)
      .pipe(
        Effect.mapError(
          () =>
            new DocumentationCheckError({ operation: "resolve-owner-policy" })
        )
      );
    const policyText = yield* fileSystem
      .readFileString(ownerPolicyPath)
      .pipe(
        Effect.mapError(
          () => new DocumentationCheckError({ operation: "read-owner-policy" })
        )
      );
    const ownerPolicy = yield* Schema.decodeEffect(
      Schema.fromJsonString(OwnerPolicy)
    )(policyText).pipe(
      Effect.mapError(
        () => new DocumentationCheckError({ operation: "decode-owner-policy" })
      )
    );
    const acceptanceRecords = HashMap.fromIterable(
      Array.flatten(
        yield* Effect.forEach(
          ownerPolicy.public.statusDecision.acceptanceRecords,
          (binding) =>
            Array.findFirst(files, (file) => file.path === binding.record).pipe(
              Option.match({
                onNone: () => Effect.succeed([]),
                onSome: (recordFile) =>
                  decodePublicPageAcceptanceRecord(recordFile.text).pipe(
                    Effect.tap((record) =>
                      record.schemaVersion === 2
                        ? verifyAcceptedSource(repositoryRoot, record)
                        : Effect.void
                    ),
                    Effect.match({
                      onFailure: () => [],
                      onSuccess: (record) => [
                        [binding.record, record] as const,
                      ],
                    })
                  ),
              })
            )
        )
      )
    );
    const manifests = yield* Effect.forEach(
      Array.filter(inventory, (entry) =>
        /^(?:apps|packages)\/.+\/package\.json$/u.test(entry)
      ),
      (manifestPath) =>
        fileSystem.readFileString(path.join(repositoryRoot, manifestPath)).pipe(
          Effect.flatMap(
            Schema.decodeEffect(Schema.fromJsonString(WorkspacePackageManifest))
          ),
          Effect.map((manifest) => {
            const packageSummary = {
              scripts: HashSet.fromIterable(
                Record.keys(manifest.scripts ?? {})
              ),
            };
            const ownedPackageSummary = manifest.name
              ? { ...packageSummary, name: manifest.name }
              : packageSummary;

            return [
              manifestPath.replace(/\/package\.json$/u, ""),
              ownedPackageSummary,
            ] as const;
          }),
          Effect.mapError(
            () =>
              new DocumentationCheckError({
                operation: "decode-workspace-package-manifest",
              })
          )
        ),
      { concurrency: 8 }
    );
    const rootManifest = yield* fileSystem
      .readFileString(path.join(repositoryRoot, "package.json"))
      .pipe(
        Effect.flatMap(
          Schema.decodeEffect(Schema.fromJsonString(WorkspacePackageManifest))
        ),
        Effect.mapError(
          () =>
            new DocumentationCheckError({
              operation: "decode-root-package-manifest",
            })
        )
      );
    return inspectDocumentation({
      acceptanceRecords,
      files,
      ownerPolicy,
      rootScripts: HashSet.fromIterable(
        Record.keys(rootManifest.scripts ?? {})
      ),
      workspaceScripts: HashMap.fromIterable(manifests),
    });
  }).pipe(Effect.scoped);

const program = (json: boolean) =>
  Effect.gen(function* documentationMain() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* path.fromFileUrl(repositoryRootUrl).pipe(
      Effect.mapError(
        () =>
          new DocumentationCheckError({
            operation: "resolve-repository-root",
          })
      )
    );
    const report = yield* checkDocumentation(root);
    const receipt = receiptFor(report);
    const fullReport = yield* encodeReceipt(
      new DocumentationReceipt({
        ...receipt,
        diagnostics: report.diagnostics,
        omittedDiagnostics: 0,
      })
    );
    yield* fileSystem
      .makeDirectory(path.join(root, "tmp"), { recursive: true })
      .pipe(
        Effect.mapError(
          () =>
            new DocumentationCheckError({
              operation: "create-report-directory",
            })
        )
      );
    yield* fileSystem
      .writeFileString(path.join(root, reportPath), fullReport)
      .pipe(
        Effect.mapError(
          () => new DocumentationCheckError({ operation: "write-full-report" })
        )
      );
    const output = json ? yield* encodeReceipt(receipt) : renderHuman(receipt);
    yield* Console.info(output);
    return yield* receipt.ok
      ? Effect.void
      : Effect.fail(
          new DocumentationCheckError({
            operation: "documentation-policy-violations",
          })
        );
  }).pipe(Effect.scoped);

const command = Command.make(
  "check-docs",
  { json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json }) => program(json)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(
      Command.run(command, {
        renderErrors: false,
        version: "repository-local",
      }).pipe(
        Effect.tapError(() =>
          Console.error(
            "Documentation check could not complete; repair the named repository-local policy or command options and rerun bun run check:docs."
          )
        ),
        Effect.provide(BunServices.layer)
      ),
      { disableErrorReporting: true }
    )
  ),
  Match.orElse(() => false)
);
