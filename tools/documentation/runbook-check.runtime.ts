import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  ReleaseAcceptedAttemptSummary,
  ReleaseJourneyInventory,
  ReleaseProofPacket,
} from "@taxkit/scripts/release-readiness";
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
} from "effect";
import { Command } from "effect/cli";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { inspectRunbookContract } from "./runbook-policy.js";
import {
  Hgi203ValidationProjection,
  RunbookContract,
  RunbookValidationError,
  RunbookValidationReceipt,
  WorkspacePackageManifest,
} from "./schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);
const reportPath = "tmp/runbook-validation-report.json" as const;
const receiptLimit = 20;
const sha256Text = (value: string) =>
  Effect.tryPromise({
    catch: () =>
      new RunbookValidationError({ operation: "hash-runbook-evidence" }),
    try: () => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  }).pipe(
    Effect.map(
      (digest) =>
        `sha256:${Array.map(
          Array.fromIterable(new Uint8Array(digest)),
          (byte) => byte.toString(16).padStart(2, "0")
        ).join("")}`
    )
  );

const makeProgram = (rootUrl: URL) =>
  Effect.gen(function* runbookValidationMain() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const repositoryRoot = yield* path
      .fromFileUrl(rootUrl)
      .pipe(
        Effect.mapError(
          () =>
            new RunbookValidationError({ operation: "resolve-repository-root" })
        )
      );

    const contractText = yield* fileSystem
      .readFileString(
        path.join(repositoryRoot, "tools/documentation/runbook-contract.json")
      )
      .pipe(
        Effect.mapError(
          () =>
            new RunbookValidationError({ operation: "read-runbook-contract" })
        )
      );
    const contract = yield* Schema.decodeEffect(
      Schema.fromJsonString(RunbookContract),
      { onExcessProperty: "error" }
    )(contractText).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({ operation: "decode-runbook-contract" })
      )
    );

    const inspectionPaths = Array.dedupe([
      "docs/runbooks/README.md",
      "docs/operations/authority-model.md",
      contract.acceptedHandoff.packet,
      contract.acceptedHandoff.historicalJourneyInventory,
      contract.acceptedHandoff.currentJourneyInventory,
      contract.acceptedHandoff.acceptedSummary,
      contract.acceptedHandoff.failedProvenance,
      contract.acceptedHandoff.validationReceipt,
      ...Array.flatMap(contract.runbooks, (runbook) => [
        runbook.path,
        ...runbook.evidencePaths,
      ]),
    ]);
    const files = HashMap.fromIterable(
      yield* Effect.forEach(
        inspectionPaths,
        (relativePath) =>
          fileSystem
            .readFileString(path.join(repositoryRoot, relativePath))
            .pipe(
              Effect.map((text) => [relativePath, text] as const),
              Effect.catchTag("PlatformError", () =>
                Effect.succeed([relativePath, ""] as const)
              )
            ),
        { concurrency: 1 }
      )
    );
    const runbookEntries = yield* fileSystem
      .readDirectory(path.join(repositoryRoot, "docs/runbooks"))
      .pipe(
        Effect.mapError(
          () =>
            new RunbookValidationError({ operation: "inventory-runbook-files" })
        )
      );
    const runbookPaths = Array.map(
      Array.filter(runbookEntries, (entry) => entry.endsWith(".md")),
      (entry) => `docs/runbooks/${entry}`
    );

    const rootManifestText = yield* fileSystem
      .readFileString(path.join(repositoryRoot, "package.json"))
      .pipe(
        Effect.mapError(
          () => new RunbookValidationError({ operation: "read-root-manifest" })
        )
      );
    const rootManifest = yield* Schema.decodeEffect(
      Schema.fromJsonString(WorkspacePackageManifest)
    )(rootManifestText).pipe(
      Effect.mapError(
        () => new RunbookValidationError({ operation: "decode-root-manifest" })
      )
    );
    const sdkManifestText = yield* fileSystem
      .readFileString(
        path.join(repositoryRoot, "packages/sdk/typescript/package.json")
      )
      .pipe(
        Effect.mapError(
          () => new RunbookValidationError({ operation: "read-sdk-manifest" })
        )
      );
    const sdkManifest = yield* Schema.decodeEffect(
      Schema.fromJsonString(WorkspacePackageManifest)
    )(sdkManifestText).pipe(
      Effect.mapError(
        () => new RunbookValidationError({ operation: "decode-sdk-manifest" })
      )
    );

    const packetText = HashMap.get(files, contract.acceptedHandoff.packet).pipe(
      Option.getOrElse(() => "")
    );
    const historicalJourneyInventoryText = HashMap.get(
      files,
      contract.acceptedHandoff.historicalJourneyInventory
    ).pipe(Option.getOrElse(() => ""));
    const currentJourneyInventoryText = HashMap.get(
      files,
      contract.acceptedHandoff.currentJourneyInventory
    ).pipe(Option.getOrElse(() => ""));
    const acceptedSummaryText = HashMap.get(
      files,
      contract.acceptedHandoff.acceptedSummary
    ).pipe(Option.getOrElse(() => ""));
    const validationText = HashMap.get(
      files,
      contract.acceptedHandoff.validationReceipt
    ).pipe(Option.getOrElse(() => ""));
    const packet = yield* Schema.decodeEffect(
      Schema.fromJsonString(ReleaseProofPacket)
    )(packetText).pipe(
      Effect.mapError(
        () => new RunbookValidationError({ operation: "decode-hgi-203-packet" })
      )
    );
    yield* Schema.decodeEffect(Schema.fromJsonString(ReleaseJourneyInventory))(
      historicalJourneyInventoryText
    ).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({
            operation: "decode-hgi-203-historical-journeys",
          })
      )
    );
    yield* Schema.decodeEffect(Schema.fromJsonString(ReleaseJourneyInventory))(
      currentJourneyInventoryText
    ).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({
            operation: "decode-current-critical-journeys",
          })
      )
    );
    const acceptedSummary = yield* Schema.decodeEffect(
      Schema.fromJsonString(ReleaseAcceptedAttemptSummary)
    )(acceptedSummaryText).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({
            operation: "decode-hgi-203-accepted-summary",
          })
      )
    );
    const hgi203Validation = yield* Schema.decodeEffect(
      Schema.fromJsonString(Hgi203ValidationProjection)
    )(validationText).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({
            operation: "decode-hgi-203-validation-receipt",
          })
      )
    );
    const contentManifestText = yield* HashMap.get(
      files,
      packet.candidate.contentManifest
    ).pipe(
      Option.match({
        onNone: () =>
          fileSystem
            .readFileString(
              path.join(repositoryRoot, packet.candidate.contentManifest)
            )
            .pipe(
              Effect.mapError(
                () =>
                  new RunbookValidationError({
                    operation: "read-hgi-203-content-manifest",
                  })
              )
            ),
        onSome: Effect.succeed,
      })
    );
    const diagnostics = inspectRunbookContract({
      acceptedSummary,
      acceptedSummarySha256: yield* sha256Text(acceptedSummaryText),
      contentManifestSha256: yield* sha256Text(contentManifestText),
      contract,
      files,
      hgi203Validation,
      historicalJourneyInventorySha256: yield* sha256Text(
        historicalJourneyInventoryText
      ),
      packet,
      packetSha256: yield* sha256Text(packetText),
      rootScripts: HashSet.fromIterable(
        Record.keys(rootManifest.scripts ?? {})
      ),
      runbookPaths,
      workspaceScripts: HashMap.fromIterable([
        [
          "@taxkit/sdk",
          HashSet.fromIterable(Record.keys(sdkManifest.scripts ?? {})),
        ],
      ]),
    });
    const receipt = new RunbookValidationReceipt({
      diagnostics: Array.take(diagnostics, receiptLimit),
      inspectedCommands: Array.reduce(
        contract.runbooks,
        0,
        (count, runbook) => count + runbook.commands.length
      ),
      inspectedRunbooks: contract.runbooks.length,
      nonClaim: contract.dryRun.nonClaim,
      ok: diagnostics.length === 0,
      omittedDiagnostics: Math.max(0, diagnostics.length - receiptLimit),
      operationsExecuted: [],
      postcondition: contract.dryRun.postcondition,
      reportPath,
      schemaVersion: 1,
      taskId: "HGI-204",
      violationCount: diagnostics.length,
    });
    const encoded = yield* Schema.encodeEffect(
      Schema.fromJsonString(RunbookValidationReceipt)
    )(receipt).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({ operation: "encode-runbook-receipt" })
      )
    );
    yield* fileSystem
      .makeDirectory(path.join(repositoryRoot, "tmp"), { recursive: true })
      .pipe(
        Effect.mapError(
          () =>
            new RunbookValidationError({
              operation: "create-receipt-directory",
            })
        )
      );
    yield* fileSystem
      .writeFileString(path.join(repositoryRoot, reportPath), encoded)
      .pipe(
        Effect.mapError(
          () =>
            new RunbookValidationError({ operation: "write-runbook-receipt" })
        )
      );
    yield* Console.info(
      [
        receipt.ok
          ? "Runbook validation passed."
          : "Runbook validation failed.",
        `violations=${receipt.violationCount}; runbooks=${receipt.inspectedRunbooks}; commands=${receipt.inspectedCommands}; executed=0.`,
        ...Array.map(
          receipt.diagnostics,
          (finding) =>
            `${finding.target} [${finding.invariant}] owner=${finding.owner}; recovery=${finding.recovery}`
        ),
        `omitted=${receipt.omittedDiagnostics}; detail=${receipt.reportPath}.`,
        `nonclaim=${receipt.nonClaim}`,
      ].join("\n")
    );
    return receipt.ok;
  });

export const runbookValidationOutcome = (rootUrl: URL) =>
  makeProgram(rootUrl).pipe(
    Effect.catchTag("RunbookValidationError", (error) =>
      Console.error(
        `Runbook validation could not complete. operation=${error.operation}; target=repository-local runbook contract; recovery=repair the named boundary and rerun bun run check:runbooks; nonclaim=no documented command or consequential operation was executed.`
      ).pipe(Effect.as(false))
    )
  );

const command = Command.make("check-runbooks", {}, () =>
  runbookValidationOutcome(repositoryRootUrl).pipe(
    Effect.flatMap((ok) =>
      ok
        ? Effect.void
        : Effect.fail(
            new RunbookValidationError({
              operation: "runbook-policy-violations",
            })
          )
    )
  )
);

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(
      Command.run(command, {
        renderErrors: false,
        version: "repository-local",
      }).pipe(Effect.provide(BunServices.layer)),
      { disableErrorReporting: true }
    )
  ),
  Match.orElse(() => false)
);
