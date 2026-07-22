import type {
  ReleaseAcceptedAttemptSummary,
  ReleaseProofPacket,
} from "@taxkit/scripts/release-readiness";
import { Array, HashSet, Record } from "effect";

import { RunbookDiagnostic } from "./schemas.js";
import type {
  ConsequentialOperation,
  Hgi203ValidationProjection,
  RunbookContract,
  RunbookInvariant,
} from "./schemas.js";

export type RunbookInspection = Readonly<{
  acceptedSummary: ReleaseAcceptedAttemptSummary;
  acceptedSummarySha256: string;
  contract: RunbookContract;
  files: ReadonlyMap<string, string>;
  hgi203Validation: Hgi203ValidationProjection;
  journeyInventorySha256: string;
  contentManifestSha256: string;
  packetSha256: string;
  packet: ReleaseProofPacket;
  rootScripts: ReadonlySet<string>;
  runbookPaths: readonly string[];
  workspaceScripts: ReadonlyMap<string, ReadonlySet<string>>;
}>;

const requiredRunbooks = [
  ["release-readiness", "docs/runbooks/release-readiness.md"],
  ["versioning", "docs/runbooks/versioning.md"],
  ["packed-consumer-proof", "docs/runbooks/packed-consumer-proof.md"],
  ["recovery", "docs/runbooks/recovery.md"],
] as const;

const requiredSections = [
  "Identity and resource scope",
  "Preconditions",
  "Authority",
  "Procedure",
  "Evidence and postcondition",
  "Rollback",
  "Escalation",
  "Stop conditions",
  "Limitations",
  "Non-claims",
] as const;

const requiredStops = [
  "versioning",
  "commit",
  "push",
  "tag",
  "release",
  "registry-publication",
  "deployment",
  "provider-access",
  "recovery-mutation",
] as const satisfies readonly ConsequentialOperation[];

const requiredHandoff = {
  acceptedSummary: "docs/evidence/releases/HGI-203-accepted-attempt.json",
  failedProvenance: "docs/evidence/releases/HGI-203-failed-attempts.json",
  journeyInventory: "docs/verification/critical-journeys.json",
  packet: "docs/evidence/releases/HGI-203-local.json",
  validationReceipt: "docs/documentation-audit/HGI-203-validation.json",
} as const;
const requiredHgi203SemanticCommit = "f3a7bdf4e63fcc6ce9dedaf963337def9f65c3a5";

const diagnostic = (
  invariant: RunbookInvariant,
  owner: string,
  target: string,
  recovery: string
) => new RunbookDiagnostic({ invariant, owner, recovery, target });

const sameMembers = (
  actual: readonly string[],
  expected: readonly string[]
): boolean =>
  actual.length === expected.length &&
  HashSet.size(HashSet.fromIterable(actual)) === expected.length &&
  Array.every(expected, (entry) => actual.includes(entry));

const sectionBody = (text: string, heading: string): string => {
  const escaped = heading.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return (
    new RegExp(
      `^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`,
      "mu"
    ).exec(text)?.[1] ?? ""
  ).trim();
};

// oxlint-disable-next-line eslint/complexity -- one bounded semantic inspector keeps runbook invariants together and prevents validation-helper sprawl
export const inspectRunbookContract = (
  inspection: RunbookInspection
): readonly RunbookDiagnostic[] => {
  const findings: RunbookDiagnostic[] = [];
  const { contract } = inspection;
  const expectedRunbookPaths = [
    "docs/runbooks/README.md",
    ...Array.map(requiredRunbooks, ([, path]) => path),
  ];
  if (!sameMembers(inspection.runbookPaths, expectedRunbookPaths)) {
    findings.push(
      diagnostic(
        "exact-inventory",
        contract.owner,
        "docs/runbooks/",
        "retain exactly README.md and the four canonical runbook Markdown files"
      )
    );
  }
  const actualInventory = Array.map(
    contract.runbooks,
    (runbook) => [runbook.id, runbook.path] as const
  );

  if (
    actualInventory.length !== requiredRunbooks.length ||
    Array.some(
      requiredRunbooks,
      ([id, path]) =>
        !Array.some(
          actualInventory,
          ([actualId, actualPath]) => actualId === id && actualPath === path
        )
    )
  ) {
    findings.push(
      diagnostic(
        "exact-inventory",
        contract.owner,
        "tools/documentation/runbook-contract.json#runbooks",
        "declare exactly the four canonical runbook IDs and paths"
      )
    );
  }

  const owners = Array.map(contract.runbooks, (runbook) => runbook.owner);
  if (HashSet.size(HashSet.fromIterable(owners)) !== requiredRunbooks.length) {
    findings.push(
      diagnostic(
        "unique-owner",
        contract.owner,
        "tools/documentation/runbook-contract.json#runbooks.owner",
        "assign one distinct operation owner to each canonical runbook"
      )
    );
  }

  for (const runbook of contract.runbooks) {
    const text = inspection.files.get(runbook.path) ?? "";
    const evidenceBody = sectionBody(text, "Evidence and postcondition");
    const preconditionsBody = sectionBody(text, "Preconditions");
    const procedureBody = sectionBody(text, "Procedure");
    const stopBody = sectionBody(text, "Stop conditions");
    const expectedAcceptedEvidence =
      runbook.id === "release-readiness" || runbook.id === "recovery";
    let requiredAcceptedPaths: readonly string[] = [];
    if (runbook.id === "release-readiness") {
      requiredAcceptedPaths = Record.values(requiredHandoff);
    } else if (runbook.id === "recovery") {
      requiredAcceptedPaths = [
        requiredHandoff.acceptedSummary,
        requiredHandoff.failedProvenance,
      ];
    }
    if (
      runbook.acceptedEvidenceRequired !== expectedAcceptedEvidence ||
      !Array.every(requiredAcceptedPaths, (evidencePath) =>
        runbook.evidencePaths.includes(evidencePath)
      )
    ) {
      findings.push(
        diagnostic(
          "accepted-handoff",
          runbook.owner,
          `${runbook.path}#preconditions`,
          "pin whether accepted evidence is required and retain the exact accepted handoff paths for this operation"
        )
      );
    }
    if (text.length === 0) {
      findings.push(
        diagnostic(
          "exact-inventory",
          runbook.owner,
          runbook.path,
          "create the declared canonical runbook at this exact path"
        )
      );
    }
    for (const section of requiredSections) {
      if (sectionBody(text, section).length === 0) {
        findings.push(
          diagnostic(
            "required-section",
            runbook.owner,
            `${runbook.path}#${section.toLowerCase().replaceAll(" ", "-")}`,
            `add substantive ${section.toLowerCase()} semantics`
          )
        );
      }
    }
    if (!sameMembers(runbook.stopOperations, requiredStops)) {
      findings.push(
        diagnostic(
          "authority-stop",
          runbook.owner,
          `${runbook.path}#stop-conditions`,
          "stop versioning, Git, registry, release, deployment, provider and recovery mutations when authority is unknown"
        )
      );
    }
    for (const evidencePath of runbook.evidencePaths) {
      if ((inspection.files.get(evidencePath) ?? "").length === 0) {
        findings.push(
          diagnostic(
            "evidence-path",
            runbook.owner,
            evidencePath,
            "point the runbook to an existing repository-relative evidence owner"
          )
        );
      }
    }
    for (const command of runbook.commands) {
      const scripts =
        command.scriptOwner === "root"
          ? inspection.rootScripts
          : inspection.workspaceScripts.get(command.scriptOwner);
      let expectedArgv: readonly string[] = ["bun", "run", command.script];
      if (command.scriptOwner !== "root") {
        expectedArgv = [
          "bun",
          "run",
          `--filter=${command.scriptOwner}`,
          command.script,
        ];
      } else if (command.script === "changeset") {
        expectedArgv = ["bun", "run", "changeset", "status", "--verbose"];
      }
      if (
        !scripts?.has(command.script) ||
        command.argv.length !== expectedArgv.length ||
        !Array.every(
          expectedArgv,
          (entry, index) => command.argv[index] === entry
        )
      ) {
        findings.push(
          diagnostic(
            "existing-command",
            runbook.owner,
            `${runbook.path}#${command.script}`,
            `use the existing ${command.scriptOwner} script with its exact bun run prefix`
          )
        );
      }
      const expectedAuthority =
        command.script === "version-repo" ? "versioning" : "local-proof";
      const expectedEnvironment =
        command.script === "release:present"
          ? ["RELEASE_ATTEMPT_PATH", "RELEASE_ATTEMPT_SHA256"]
          : [];
      const expectedInvocation =
        command.script === "release:present"
          ? "RELEASE_ATTEMPT_PATH=<repository-relative-receipt.json> RELEASE_ATTEMPT_SHA256=sha256:<64-hex-digest> bun run release:present"
          : command.argv.join(" ");
      if (
        command.requiredAuthority !== expectedAuthority ||
        !sameMembers(command.requiredEnvironment, expectedEnvironment)
      ) {
        findings.push(
          diagnostic(
            "authority-stop",
            runbook.owner,
            `${runbook.path}#${command.script}`,
            `require ${expectedAuthority} authority and the exact command configuration before execution`
          )
        );
      }
      if (command.executeInDryRun !== false) {
        findings.push(
          diagnostic(
            "non-executing",
            runbook.owner,
            `${runbook.path}#${command.script}`,
            "keep the validator inspect-only and execute no documented command"
          )
        );
      }
      if (
        command.invocation !== expectedInvocation ||
        !Array.every(command.requiredEnvironment, (key) =>
          command.invocation.includes(`${key}=`)
        ) ||
        !procedureBody.includes(`\`${command.invocation}\``)
      ) {
        findings.push(
          diagnostic(
            "existing-command",
            runbook.owner,
            `${runbook.path}#${command.script}`,
            `render the sidecar invocation exactly as \`${command.invocation}\` in the canonical runbook`
          )
        );
      }
    }
    if (!text.includes(`Owner: \`${runbook.owner}\``)) {
      findings.push(
        diagnostic(
          "unique-owner",
          runbook.owner,
          `${runbook.path}#owner`,
          "render the sidecar owner exactly in the canonical runbook"
        )
      );
    }
    for (const evidencePath of runbook.evidencePaths) {
      if (
        !preconditionsBody.includes(`\`${evidencePath}\``) &&
        !evidenceBody.includes(`\`${evidencePath}\``)
      ) {
        findings.push(
          diagnostic(
            "evidence-path",
            runbook.owner,
            `${runbook.path}#${evidencePath}`,
            "render every sidecar evidence path exactly in the canonical runbook"
          )
        );
      }
    }
    for (const operation of runbook.stopOperations) {
      if (!stopBody.includes(`\`${operation}\``)) {
        findings.push(
          diagnostic(
            "authority-stop",
            runbook.owner,
            `${runbook.path}#${operation}`,
            "render every sidecar stop operation exactly in the canonical runbook"
          )
        );
      }
    }
  }

  const runbookIndex = inspection.files.get("docs/runbooks/README.md") ?? "";
  const indexRows = runbookIndex
    .split("\n")
    .filter((line) => /^\| `[^`]+` \|/u.test(line));
  if (indexRows.length !== requiredRunbooks.length) {
    findings.push(
      diagnostic(
        "exact-inventory",
        contract.owner,
        "docs/runbooks/README.md#canonical-inventory",
        "render exactly four canonical runbook table rows and no extra route"
      )
    );
  }
  for (const runbook of contract.runbooks) {
    const expectedRow = `| \`${runbook.id}\` | \`${runbook.path}\` | \`${runbook.owner}\` |`;
    if (!indexRows.includes(expectedRow)) {
      findings.push(
        diagnostic(
          "exact-inventory",
          contract.owner,
          `docs/runbooks/README.md#${runbook.id}`,
          "route the exact runbook ID, path and distinct owner from the canonical index"
        )
      );
    }
  }

  const authorityOperations = Array.map(
    contract.authorityStops,
    (entry) => entry.operation
  );
  const authorityModel =
    inspection.files.get("docs/operations/authority-model.md") ?? "";
  const authorityRows = authorityModel
    .split("\n")
    .filter((line) => /^\| `[^`]+` \|/u.test(line));
  if (authorityRows.length !== requiredStops.length) {
    findings.push(
      diagnostic(
        "authority-stop",
        "taxkit-authority-model-owner",
        "docs/operations/authority-model.md#authority-inventory",
        "render exactly one authority-model row for every consequential operation"
      )
    );
  }
  if (!sameMembers(authorityOperations, requiredStops)) {
    findings.push(
      diagnostic(
        "authority-stop",
        "taxkit-authority-model-owner",
        "tools/documentation/runbook-contract.json#authorityStops",
        "record exactly one stop for every consequential operation"
      )
    );
  }
  for (const entry of contract.authorityStops) {
    if (entry.status !== "unknown-stop" || entry.principal !== "unknown") {
      findings.push(
        diagnostic(
          "authority-stop",
          "taxkit-authority-model-owner",
          `docs/operations/authority-model.md#${entry.operation}`,
          "record an unknown principal as a mandatory stop and escalation"
        )
      );
    }
    const expectedRowPrefix = `| \`${entry.operation}\` | \`${entry.principal}\` | \`${entry.status}\` |`;
    if (!authorityRows.some((row) => row.startsWith(expectedRowPrefix))) {
      findings.push(
        diagnostic(
          "authority-stop",
          "taxkit-authority-model-owner",
          `docs/operations/authority-model.md#${entry.operation}`,
          "render the exact operation, unknown principal and unknown-stop status in the authority model"
        )
      );
    }
  }

  for (const [field, expectedPath] of Record.toEntries(requiredHandoff)) {
    if (contract.acceptedHandoff[field] !== expectedPath) {
      findings.push(
        diagnostic(
          "accepted-handoff",
          "taxkit-release-readiness-operation-owner",
          `tools/documentation/runbook-contract.json#acceptedHandoff.${field}`,
          `use the canonical accepted HGI-203 owner ${expectedPath}`
        )
      );
    }
  }
  const [summaryArtifact] = inspection.packet.attempt.detailArtifacts;
  if (
    inspection.packet.lifecycle !== "accepted" ||
    inspection.packet.attempt.terminalState !== "success" ||
    inspection.packet.attempt.observedExitCode !== 0 ||
    inspection.packet.journeyInventorySha256 !==
      inspection.journeyInventorySha256 ||
    inspection.packet.attempt.detailArtifacts.length !== 1 ||
    summaryArtifact?.path !== requiredHandoff.acceptedSummary ||
    summaryArtifact.sha256 !== inspection.acceptedSummarySha256 ||
    inspection.acceptedSummary.attemptId !==
      inspection.packet.attempt.attemptId ||
    inspection.acceptedSummary.candidate.baseCommit !==
      inspection.packet.candidate.baseCommit ||
    inspection.acceptedSummary.candidate.contentManifest !==
      inspection.packet.candidate.contentManifest ||
    inspection.acceptedSummary.candidate.contentSha256BeforeAttempt !==
      inspection.packet.candidate.contentSha256 ||
    !inspection.packet.retainedEvidence.includes(
      requiredHandoff.failedProvenance
    ) ||
    inspection.hgi203Validation.candidate.attemptId !==
      inspection.acceptedSummary.attemptId ||
    inspection.hgi203Validation.semanticCommit !==
      requiredHgi203SemanticCommit ||
    inspection.hgi203Validation.candidate.contentManifest !==
      inspection.packet.candidate.contentManifest ||
    `sha256:${inspection.hgi203Validation.candidate.contentManifestSha256.replace(/^sha256:/u, "")}` !==
      inspection.contentManifestSha256 ||
    inspection.hgi203Validation.candidate.packet !== requiredHandoff.packet ||
    `sha256:${inspection.hgi203Validation.candidate.packetSha256.replace(/^sha256:/u, "")}` !==
      inspection.packetSha256 ||
    inspection.hgi203Validation.candidate.acceptedSummary !==
      requiredHandoff.acceptedSummary ||
    `sha256:${inspection.hgi203Validation.candidate.acceptedSummarySha256.replace(/^sha256:/u, "")}` !==
      inspection.acceptedSummarySha256
  ) {
    findings.push(
      diagnostic(
        "accepted-handoff",
        "taxkit-release-readiness-operation-owner",
        "docs/evidence/releases/HGI-203-local.json",
        "bind the accepted HGI-203 packet, five journeys, bounded summary and failed provenance without candidate or tmp substitution"
      )
    );
  }

  if (
    contract.dryRun.executeCommands !== false ||
    contract.dryRun.operationsExecuted.length !== 0 ||
    contract.dryRun.reportPath !== "tmp/runbook-validation-report.json"
  ) {
    findings.push(
      diagnostic(
        "non-executing",
        contract.owner,
        "tools/documentation/runbook-contract.json#dryRun",
        "write only the bounded ignored receipt and execute no operation"
      )
    );
  }

  return findings;
};
