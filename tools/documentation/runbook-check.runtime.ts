import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  ReleaseAcceptedAttemptSummary,
  ReleaseJourneyInventory,
  ReleaseProofPacket,
} from "@taxkit/scripts/release-readiness";
import {
  Array as EffectArray,
  Console,
  Effect,
  Match,
  Record,
  Schema,
} from "effect";
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
  Effect.promise(async () => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value)
    );
    return `sha256:${EffectArray.fromIterable(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`;
  });

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
    const contract = yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(RunbookContract),
      { onExcessProperty: "error" }
    )(contractText).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({ operation: "decode-runbook-contract" })
      )
    );

    const inspectionPaths = EffectArray.dedupe([
      "docs/runbooks/README.md",
      "docs/operations/authority-model.md",
      contract.acceptedHandoff.packet,
      contract.acceptedHandoff.journeyInventory,
      contract.acceptedHandoff.acceptedSummary,
      contract.acceptedHandoff.failedProvenance,
      contract.acceptedHandoff.validationReceipt,
      ...EffectArray.flatMap(contract.runbooks, (runbook) => [
        runbook.path,
        ...runbook.evidencePaths,
      ]),
    ]);
    const files = new Map(
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
    const runbookPaths = EffectArray.map(
      EffectArray.filter(runbookEntries, (entry) => entry.endsWith(".md")),
      (entry) => `docs/runbooks/${entry}`
    );

    const rootManifestText = yield* fileSystem
      .readFileString(path.join(repositoryRoot, "package.json"))
      .pipe(
        Effect.mapError(
          () => new RunbookValidationError({ operation: "read-root-manifest" })
        )
      );
    const rootManifest = yield* Schema.decodeUnknownEffect(
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
    const sdkManifest = yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(WorkspacePackageManifest)
    )(sdkManifestText).pipe(
      Effect.mapError(
        () => new RunbookValidationError({ operation: "decode-sdk-manifest" })
      )
    );

    const packetText = files.get(contract.acceptedHandoff.packet) ?? "";
    const journeyInventoryText =
      files.get(contract.acceptedHandoff.journeyInventory) ?? "";
    const acceptedSummaryText =
      files.get(contract.acceptedHandoff.acceptedSummary) ?? "";
    const validationText =
      files.get(contract.acceptedHandoff.validationReceipt) ?? "";
    const packet = yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(ReleaseProofPacket)
    )(packetText).pipe(
      Effect.mapError(
        () => new RunbookValidationError({ operation: "decode-hgi-203-packet" })
      )
    );
    yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(ReleaseJourneyInventory)
    )(journeyInventoryText).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({ operation: "decode-hgi-203-journeys" })
      )
    );
    const acceptedSummary = yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(ReleaseAcceptedAttemptSummary)
    )(acceptedSummaryText).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({
            operation: "decode-hgi-203-accepted-summary",
          })
      )
    );
    const hgi203Validation = yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(Hgi203ValidationProjection)
    )(validationText).pipe(
      Effect.mapError(
        () =>
          new RunbookValidationError({
            operation: "decode-hgi-203-validation-receipt",
          })
      )
    );
    const contentManifestText =
      files.get(packet.candidate.contentManifest) ??
      (yield* fileSystem
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
        ));
    const diagnostics = inspectRunbookContract({
      acceptedSummary,
      acceptedSummarySha256: yield* sha256Text(acceptedSummaryText),
      contentManifestSha256: yield* sha256Text(contentManifestText),
      contract,
      files,
      hgi203Validation,
      journeyInventorySha256: yield* sha256Text(journeyInventoryText),
      packet,
      packetSha256: yield* sha256Text(packetText),
      rootScripts: new Set(Record.keys(rootManifest.scripts ?? {})),
      runbookPaths,
      workspaceScripts: new Map([
        ["@taxkit/sdk", new Set(Record.keys(sdkManifest.scripts ?? {}))],
      ]),
    });
    const receipt = new RunbookValidationReceipt({
      diagnostics: EffectArray.take(diagnostics, receiptLimit),
      inspectedCommands: EffectArray.reduce(
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
    const encoded = yield* Schema.encodeUnknownEffect(
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
        ...EffectArray.map(
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
    Effect.provide(BunServices.layer),
    Effect.catchTag("RunbookValidationError", (error) =>
      Console.error(
        `Runbook validation could not complete. operation=${error.operation}; target=repository-local runbook contract; recovery=repair the named boundary and rerun bun run check:runbooks; nonclaim=no documented command or consequential operation was executed.`
      ).pipe(Effect.as(false))
    )
  );

const boundedProgram = runbookValidationOutcome(repositoryRootUrl);

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(
      boundedProgram.pipe(
        Effect.tap((ok) =>
          Effect.sync(() => {
            process.exitCode = ok ? 0 : 1;
          })
        )
      )
    )
  ),
  Match.orElse(() => false)
);
