import type {
  ReleaseAcceptedAttemptSummary,
  ReleaseProofPacket,
} from "@taxkit/scripts/release-readiness";
import { Array, HashMap, HashSet, Option, Match, Record } from "effect";

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
  files: HashMap.HashMap<string, string>;
  hgi203Validation: Hgi203ValidationProjection;
  historicalJourneyInventorySha256: string;
  contentManifestSha256: string;
  packetSha256: string;
  packet: ReleaseProofPacket;
  rootScripts: HashSet.HashSet<string>;
  runbookPaths: readonly string[];
  workspaceScripts: HashMap.HashMap<string, HashSet.HashSet<string>>;
}>;

const requiredRunbooks = [
  ["release-readiness", "docs/runbooks/release-readiness.md"],
  ["versioning", "docs/runbooks/versioning.md"],
  ["packed-consumer-proof", "docs/runbooks/packed-consumer-proof.md"],
  ["recovery", "docs/runbooks/recovery.md"],
  ["docs-deployment", "docs/runbooks/docs-deployment.md"],
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
  currentJourneyInventory: "docs/verification/critical-journeys.json",
  failedProvenance: "docs/evidence/releases/HGI-203-failed-attempts.json",
  historicalJourneyInventory:
    "docs/evidence/releases/HGI-203-critical-journeys.json",
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
  Array.every(expected, (entry) => Array.contains(actual, entry));

const sectionBody = (text: string, heading: string): string => {
  const escaped = heading.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return Record.get(
    new RegExp(
      `^## ${escaped}\\s*$(?<body>[\\s\\S]*?)(?=^## |(?![\\s\\S]))`,
      "mu"
    ).exec(text)?.groups ?? {},
    "body"
  )
    .pipe(Option.getOrElse(() => ""))
    .trim();
};

// oxlint-disable-next-line eslint/complexity -- one bounded semantic inspector keeps runbook invariants together and prevents validation-helper sprawl
export const inspectRunbookContract = (
  inspection: RunbookInspection
): readonly RunbookDiagnostic[] => {
  const { contract } = inspection;
  const expectedRunbookPaths = [
    "docs/runbooks/README.md",
    ...Array.map(requiredRunbooks, ([, path]) => path),
  ];
  const actualInventory = Array.map(
    contract.runbooks,
    (runbook) => [runbook.id, runbook.path] as const
  );
  const owners = Array.map(contract.runbooks, (runbook) => runbook.owner);
  const runbookIndex = HashMap.get(
    inspection.files,
    "docs/runbooks/README.md"
  ).pipe(Option.getOrElse(() => ""));
  const indexRows = Array.filter(runbookIndex.split("\n"), (line) =>
    /^\| `[^`]+` \|/u.test(line)
  );
  const authorityOperations = Array.map(
    contract.authorityStops,
    (entry) => entry.operation
  );
  const authorityModel = HashMap.get(
    inspection.files,
    "docs/operations/authority-model.md"
  ).pipe(Option.getOrElse(() => ""));
  const authorityRows = Array.filter(authorityModel.split("\n"), (line) =>
    /^\| `[^`]+` \|/u.test(line)
  );
  const summaryArtifact = Array.head(
    inspection.packet.attempt.detailArtifacts
  ).pipe(Option.getOrUndefined);
  return [
    ...(sameMembers(inspection.runbookPaths, expectedRunbookPaths)
      ? []
      : [
          diagnostic(
            "exact-inventory",
            contract.owner,
            "docs/runbooks/",
            "retain exactly README.md and the five canonical runbook Markdown files"
          ),
        ]),
    ...(actualInventory.length !== requiredRunbooks.length ||
    Array.some(
      requiredRunbooks,
      ([id, path]) =>
        !Array.some(
          actualInventory,
          ([actualId, actualPath]) => actualId === id && actualPath === path
        )
    )
      ? [
          diagnostic(
            "exact-inventory",
            contract.owner,
            "tools/documentation/runbook-contract.json#runbooks",
            "declare exactly the five canonical runbook IDs and paths"
          ),
        ]
      : []),
    ...(HashSet.size(HashSet.fromIterable(owners)) === requiredRunbooks.length
      ? []
      : [
          diagnostic(
            "unique-owner",
            contract.owner,
            "tools/documentation/runbook-contract.json#runbooks.owner",
            "assign one distinct operation owner to each canonical runbook"
          ),
        ]),
    ...Array.flatMap(contract.runbooks, (runbook) => {
      const text = HashMap.get(inspection.files, runbook.path).pipe(
        Option.getOrElse(() => "")
      );
      const evidenceBody = sectionBody(text, "Evidence and postcondition");
      const preconditionsBody = sectionBody(text, "Preconditions");
      const procedureBody = sectionBody(text, "Procedure");
      const stopBody = sectionBody(text, "Stop conditions");
      const expectedAcceptedEvidence =
        runbook.id === "release-readiness" || runbook.id === "recovery";
      const requiredAcceptedPaths: readonly string[] = Match.value(
        runbook.id
      ).pipe(
        Match.when("release-readiness", () => Record.values(requiredHandoff)),
        Match.when("recovery", () => [
          requiredHandoff.acceptedSummary,
          requiredHandoff.failedProvenance,
        ]),
        Match.orElse(() => [])
      );
      return [
        ...(runbook.acceptedEvidenceRequired !== expectedAcceptedEvidence ||
        !Array.every(requiredAcceptedPaths, (evidencePath) =>
          Array.contains(runbook.evidencePaths, evidencePath)
        )
          ? [
              diagnostic(
                "accepted-handoff",
                runbook.owner,
                `${runbook.path}#preconditions`,
                "pin whether accepted evidence is required and retain the exact accepted handoff paths for this operation"
              ),
            ]
          : []),
        ...(text.length === 0
          ? [
              diagnostic(
                "exact-inventory",
                runbook.owner,
                runbook.path,
                "create the declared canonical runbook at this exact path"
              ),
            ]
          : []),
        ...Array.flatMap(requiredSections, (section) =>
          sectionBody(text, section).length === 0
            ? [
                diagnostic(
                  "required-section",
                  runbook.owner,
                  `${runbook.path}#${section.toLowerCase().replaceAll(" ", "-")}`,
                  `add substantive ${section.toLowerCase()} semantics`
                ),
              ]
            : []
        ),
        ...(sameMembers(runbook.stopOperations, requiredStops)
          ? []
          : [
              diagnostic(
                "authority-stop",
                runbook.owner,
                `${runbook.path}#stop-conditions`,
                "stop versioning, Git, registry, release, deployment, provider and recovery mutations when authority is unknown"
              ),
            ]),
        ...Array.flatMap(runbook.evidencePaths, (evidencePath) =>
          HashMap.get(inspection.files, evidencePath).pipe(
            Option.getOrElse(() => "")
          ).length === 0
            ? [
                diagnostic(
                  "evidence-path",
                  runbook.owner,
                  evidencePath,
                  "point the runbook to an existing repository-relative evidence owner"
                ),
              ]
            : []
        ),
        ...Array.flatMap(runbook.commands, (command) => {
          const scripts =
            command.scriptOwner === "root"
              ? inspection.rootScripts
              : HashMap.get(
                  inspection.workspaceScripts,
                  command.scriptOwner
                ).pipe(Option.getOrElse(() => HashSet.empty<string>()));
          const rootArgv =
            command.script === "changeset"
              ? ["bun", "run", "changeset", "status", "--verbose"]
              : ["bun", "run", command.script];
          const expectedArgv: readonly string[] =
            command.scriptOwner === "root"
              ? rootArgv
              : [
                  "bun",
                  "run",
                  `--filter=${command.scriptOwner}`,
                  command.script,
                ];
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
          return [
            ...(!HashSet.has(scripts, command.script) ||
            command.argv.length !== expectedArgv.length ||
            !Array.every(expectedArgv, (entry, index) =>
              Array.get(command.argv, index).pipe(Option.contains(entry))
            )
              ? [
                  diagnostic(
                    "existing-command",
                    runbook.owner,
                    `${runbook.path}#${command.script}`,
                    `use the existing ${command.scriptOwner} script with its exact bun run prefix`
                  ),
                ]
              : []),
            ...(command.requiredAuthority !== expectedAuthority ||
            !sameMembers(command.requiredEnvironment, expectedEnvironment)
              ? [
                  diagnostic(
                    "authority-stop",
                    runbook.owner,
                    `${runbook.path}#${command.script}`,
                    `require ${expectedAuthority} authority and the exact command configuration before execution`
                  ),
                ]
              : []),
            ...(command.executeInDryRun === false
              ? []
              : [
                  diagnostic(
                    "non-executing",
                    runbook.owner,
                    `${runbook.path}#${command.script}`,
                    "keep the validator inspect-only and execute no documented command"
                  ),
                ]),
            ...(command.invocation !== expectedInvocation ||
            !Array.every(command.requiredEnvironment, (key) =>
              command.invocation.includes(`${key}=`)
            ) ||
            !procedureBody.includes(`\`${command.invocation}\``)
              ? [
                  diagnostic(
                    "existing-command",
                    runbook.owner,
                    `${runbook.path}#${command.script}`,
                    `render the sidecar invocation exactly as \`${command.invocation}\` in the canonical runbook`
                  ),
                ]
              : []),
          ];
        }),
        ...(text.includes(`Owner: \`${runbook.owner}\``)
          ? []
          : [
              diagnostic(
                "unique-owner",
                runbook.owner,
                `${runbook.path}#owner`,
                "render the sidecar owner exactly in the canonical runbook"
              ),
            ]),
        ...Array.flatMap(runbook.evidencePaths, (evidencePath) =>
          !preconditionsBody.includes(`\`${evidencePath}\``) &&
          !evidenceBody.includes(`\`${evidencePath}\``)
            ? [
                diagnostic(
                  "evidence-path",
                  runbook.owner,
                  `${runbook.path}#${evidencePath}`,
                  "render every sidecar evidence path exactly in the canonical runbook"
                ),
              ]
            : []
        ),
        ...Array.flatMap(runbook.stopOperations, (operation) =>
          stopBody.includes(`\`${operation}\``)
            ? []
            : [
                diagnostic(
                  "authority-stop",
                  runbook.owner,
                  `${runbook.path}#${operation}`,
                  "render every sidecar stop operation exactly in the canonical runbook"
                ),
              ]
        ),
      ];
    }),
    ...(indexRows.length === requiredRunbooks.length
      ? []
      : [
          diagnostic(
            "exact-inventory",
            contract.owner,
            "docs/runbooks/README.md#canonical-inventory",
            "render exactly five canonical runbook table rows and no extra route"
          ),
        ]),
    ...Array.flatMap(contract.runbooks, (runbook) => {
      const expectedRow = `| \`${runbook.id}\` | \`${runbook.path}\` | \`${runbook.owner}\` |`;
      return Array.contains(indexRows, expectedRow)
        ? []
        : [
            diagnostic(
              "exact-inventory",
              contract.owner,
              `docs/runbooks/README.md#${runbook.id}`,
              "route the exact runbook ID, path and distinct owner from the canonical index"
            ),
          ];
    }),
    ...(authorityRows.length === requiredStops.length
      ? []
      : [
          diagnostic(
            "authority-stop",
            "taxkit-authority-model-owner",
            "docs/operations/authority-model.md#authority-inventory",
            "render exactly one authority-model row for every consequential operation"
          ),
        ]),
    ...(sameMembers(authorityOperations, requiredStops)
      ? []
      : [
          diagnostic(
            "authority-stop",
            "taxkit-authority-model-owner",
            "tools/documentation/runbook-contract.json#authorityStops",
            "record exactly one stop for every consequential operation"
          ),
        ]),
    ...Array.flatMap(contract.authorityStops, (entry) => {
      const expectedRowPrefix = `| \`${entry.operation}\` | \`${entry.principal}\` | \`${entry.status}\` |`;
      return [
        ...(entry.status !== "unknown-stop" || entry.principal !== "unknown"
          ? [
              diagnostic(
                "authority-stop",
                "taxkit-authority-model-owner",
                `docs/operations/authority-model.md#${entry.operation}`,
                "record an unknown principal as a mandatory stop and escalation"
              ),
            ]
          : []),
        ...(Array.some(authorityRows, (row) =>
          row.startsWith(expectedRowPrefix)
        )
          ? []
          : [
              diagnostic(
                "authority-stop",
                "taxkit-authority-model-owner",
                `docs/operations/authority-model.md#${entry.operation}`,
                "render the exact operation, unknown principal and unknown-stop status in the authority model"
              ),
            ]),
      ];
    }),
    ...Array.flatMap(
      Record.toEntries(requiredHandoff),
      ([field, expectedPath]) =>
        Record.get(contract.acceptedHandoff, field).pipe(
          Option.contains<string>(expectedPath)
        )
          ? []
          : [
              diagnostic(
                "accepted-handoff",
                "taxkit-release-readiness-operation-owner",
                `tools/documentation/runbook-contract.json#acceptedHandoff.${field}`,
                `use the canonical accepted HGI-203 owner ${expectedPath}`
              ),
            ]
    ),
    ...(inspection.packet.lifecycle !== "accepted" ||
    inspection.packet.attempt.terminalState !== "success" ||
    inspection.packet.attempt.observedExitCode !== 0 ||
    inspection.packet.journeyInventorySha256 !==
      inspection.historicalJourneyInventorySha256 ||
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
    !Array.contains(
      inspection.packet.retainedEvidence,
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
      ? [
          diagnostic(
            "accepted-handoff",
            "taxkit-release-readiness-operation-owner",
            "docs/evidence/releases/HGI-203-local.json",
            "bind the accepted HGI-203 packet to its exact historical journey snapshot, bounded summary and failed provenance without candidate, current-owner or tmp substitution"
          ),
        ]
      : []),
    ...(contract.dryRun.executeCommands !== false ||
    contract.dryRun.operationsExecuted.length !== 0 ||
    contract.dryRun.reportPath !== "tmp/runbook-validation-report.json"
      ? [
          diagnostic(
            "non-executing",
            contract.owner,
            "tools/documentation/runbook-contract.json#dryRun",
            "write only the bounded ignored receipt and execute no operation"
          ),
        ]
      : []),
  ];
};
