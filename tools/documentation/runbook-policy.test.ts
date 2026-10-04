import { describe, expect, it as test } from "@effect/vitest";
import {
  ReleaseAcceptedAttemptSummary,
  ReleaseJourneyInventory,
  ReleaseProofPacket,
} from "@taxkit/scripts/release-readiness";
import {
  Array,
  Effect,
  HashMap,
  HashSet,
  Option,
  Match,
  Record as EffectRecord,
  Schema,
} from "effect";
import { forEach } from "effect/Array";

import hgi203ValidationJson from "../../docs/documentation-audit/HGI-203-validation.json";
import acceptedSummaryJson from "../../docs/evidence/releases/HGI-203-accepted-attempt.json";
import historicalJourneyInventoryJson from "../../docs/evidence/releases/HGI-203-critical-journeys.json";
import packetJson from "../../docs/evidence/releases/HGI-203-local.json";
import currentJourneyInventoryJson from "../../docs/verification/critical-journeys.json";
import contractJson from "./runbook-contract.json";
import { inspectRunbookContract } from "./runbook-policy.js";
import type { RunbookInspection } from "./runbook-policy.js";
import { Hgi203ValidationProjection, RunbookContract } from "./schemas.js";

const sectionNames = [
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

const decodeContract = Schema.decodeUnknownEffect(RunbookContract, {
  onExcessProperty: "error",
});
const decodeValidation = Schema.decodeUnknownEffect(Hgi203ValidationProjection);

const runbookMarkdown = (
  runbook: RunbookInspection["contract"]["runbooks"][number],
  emptySection?: (typeof sectionNames)[number]
) => {
  const sections = Array.flatMap(sectionNames, (section) => {
    const body = Match.value(section).pipe(
      Match.when("Preconditions", () =>
        Array.map(
          runbook.evidencePaths,
          (path) => `Required evidence: \`${path}\`.`
        ).join("\n")
      ),
      Match.when("Procedure", () =>
        Array.map(
          runbook.commands,
          (command) => `Run \`${command.invocation}\`.`
        ).join("\n")
      ),
      Match.when("Stop conditions", () =>
        Array.map(
          runbook.stopOperations,
          (operation) => `Stop \`${operation}\`.`
        ).join("\n")
      ),
      Match.orElse(() => `${section} has an explicit contract.`)
    );
    return [`## ${section}`, section === emptySection ? "" : body];
  });
  return [`Owner: \`${runbook.owner}\``, ...sections].join("\n\n");
};

const validInspection = Effect.gen(function* () {
  const [contract, packet, acceptedSummary, hgi203Validation] =
    yield* Effect.all([
      decodeContract(contractJson),
      Schema.decodeUnknownEffect(ReleaseProofPacket)(packetJson),
      Schema.decodeUnknownEffect(ReleaseAcceptedAttemptSummary)(
        acceptedSummaryJson
      ),
      decodeValidation(hgi203ValidationJson),
      Schema.decodeUnknownEffect(ReleaseJourneyInventory)(
        historicalJourneyInventoryJson
      ),
      Schema.decodeUnknownEffect(ReleaseJourneyInventory)(
        currentJourneyInventoryJson
      ),
    ]);
  const files = HashMap.fromIterable([
    ...Array.flatMap(contract.runbooks, (runbook) => [
      [runbook.path, runbookMarkdown(runbook)] as const,
      ...Array.map(
        runbook.evidencePaths,
        (path) => [path, "retained evidence"] as const
      ),
    ]),
    [
      "docs/runbooks/README.md",
      Array.map(
        contract.runbooks,
        (runbook) =>
          `| \`${runbook.id}\` | \`${runbook.path}\` | \`${runbook.owner}\` |`
      ).join("\n"),
    ] as const,
    [
      "docs/operations/authority-model.md",
      Array.map(
        contract.authorityStops,
        (entry) =>
          `| \`${entry.operation}\` | \`${entry.principal}\` | \`${entry.status}\` | receipt |`
      ).join("\n"),
    ] as const,
    ...Array.map(
      EffectRecord.values(contract.acceptedHandoff),
      (path) => [path, "retained evidence"] as const
    ),
  ]);
  return {
    acceptedSummary,
    acceptedSummarySha256: Array.head(packet.attempt.detailArtifacts).pipe(
      Option.map((artifact) => artifact.sha256),
      Option.getOrElse(() => "missing")
    ),
    contentManifestSha256: `sha256:${hgi203Validation.candidate.contentManifestSha256.replace(/^sha256:/u, "")}`,
    contract,
    files,
    hgi203Validation,
    historicalJourneyInventorySha256: packet.journeyInventorySha256,
    packet,
    packetSha256: `sha256:${hgi203Validation.candidate.packetSha256.replace(/^sha256:/u, "")}`,
    rootScripts: HashSet.fromIterable([
      "changeset",
      "release:check",
      "release:present",
      "test:release-readiness",
      "verification",
      "version-repo",
      "check:docs-deployment",
    ]),
    runbookPaths: [
      "docs/runbooks/README.md",
      ...Array.map(contract.runbooks, (runbook) => runbook.path),
    ],
    workspaceScripts: HashMap.fromIterable([
      [
        "@taxkit/sdk",
        HashSet.fromIterable(["check-packed-artifact", "validate:downstream"]),
      ],
    ]),
  } satisfies RunbookInspection;
});

describe("runbook policy", () => {
  test.effect(
    "accepts the strict five-runbook contract and parses a substantive final section",
    () =>
      Effect.gen(function* () {
        const inspection = yield* validInspection;
        expect(inspectRunbookContract(inspection)).toEqual([]);
        expect(ReleaseProofPacket).toBeDefined();
        expect(ReleaseAcceptedAttemptSummary).toBeDefined();
        expect(ReleaseJourneyInventory).toBeDefined();
      })
  );

  test.effect("rejects unknown-principal authority drift", () =>
    Effect.gen(function* () {
      const inspection = yield* validInspection;
      const contract = yield* decodeContract({
        ...contractJson,
        authorityStops: Array.map(
          contractJson.authorityStops,
          (entry, index) =>
            index === 0
              ? { ...entry, principal: "unrecorded-person", status: "approved" }
              : entry
        ),
      });
      const findings = inspectRunbookContract({ ...inspection, contract });
      expect(findings).toContainEqual(
        expect.objectContaining({ invariant: "authority-stop" })
      );
    })
  );

  test.effect(
    "rejects nonexistent commands with exact target and recovery",
    () =>
      Effect.gen(function* () {
        const inspection = yield* validInspection;
        const contract = yield* decodeContract({
          ...contractJson,
          runbooks: Array.map(contractJson.runbooks, (runbook, index) =>
            index === 0
              ? {
                  ...runbook,
                  commands: Array.map(
                    runbook.commands,
                    (command, commandIndex) =>
                      commandIndex === 0
                        ? {
                            ...command,
                            argv: ["bun", "run", "not-a-script"],
                            invocation: "bun run not-a-script",
                            script: "not-a-script",
                          }
                        : command
                  ),
                }
              : runbook
          ),
        });
        const findings = inspectRunbookContract({ ...inspection, contract });
        expect(findings).toContainEqual(
          expect.objectContaining({
            invariant: "existing-command",
            recovery: expect.stringContaining("existing root script"),
            target: expect.stringContaining("not-a-script"),
          })
        );
      })
  );

  forEach(
    [
      ["missing bun run prefix", ["bun", "changeset", "status", "--verbose"]],
      [
        "wrong executable prefix",
        ["npm", "run", "changeset", "status", "--verbose"],
      ],
      ["missing documented script arguments", ["bun", "run", "changeset"]],
    ] as const,
    ([name, argv]) => {
      test.effect(`rejects ${name}`, () =>
        Effect.gen(function* () {
          const inspection = yield* validInspection;
          const contract = yield* decodeContract({
            ...contractJson,
            runbooks: Array.map(contractJson.runbooks, (runbook) => ({
              ...runbook,
              commands: Array.map(runbook.commands, (command) =>
                command.script === "changeset" ? { ...command, argv } : command
              ),
            })),
          });
          expect(
            inspectRunbookContract({ ...inspection, contract })
          ).toContainEqual(
            expect.objectContaining({ invariant: "existing-command" })
          );
        })
      );
    }
  );

  test.effect("rejects duplicate owners", () =>
    Effect.gen(function* () {
      const inspection = yield* validInspection;
      const duplicateOwner = Array.head(contractJson.runbooks).pipe(
        Option.map((runbook) => runbook.owner),
        Option.getOrElse(() => "missing")
      );
      const contract = yield* decodeContract({
        ...contractJson,
        runbooks: Array.map(contractJson.runbooks, (runbook, index) =>
          index === 1 ? { ...runbook, owner: duplicateOwner } : runbook
        ),
      });
      expect(
        inspectRunbookContract({ ...inspection, contract })
      ).toContainEqual(expect.objectContaining({ invariant: "unique-owner" }));
    })
  );

  forEach(["Rollback", "Escalation"] as const, (missing) => {
    test.effect(`rejects an empty ${missing.toLowerCase()} section`, () =>
      Effect.gen(function* () {
        const inspection = yield* validInspection;
        const first = Array.head(inspection.contract.runbooks).pipe(
          Option.getOrElse(() => expect.unreachable())
        );
        const files = HashMap.fromIterable([
          ...inspection.files,
          [first.path, runbookMarkdown(first, missing)] as const,
        ]);
        expect(inspectRunbookContract({ ...inspection, files })).toContainEqual(
          expect.objectContaining({
            invariant: "required-section",
            target: expect.stringContaining(missing.toLowerCase()),
          })
        );
      })
    );
  });

  test.effect("rejects candidate or tmp proof substitution", () =>
    Effect.gen(function* () {
      const inspection = yield* validInspection;
      const contract = yield* decodeContract({
        ...contractJson,
        acceptedHandoff: {
          ...contractJson.acceptedHandoff,
          packet: "tmp/HGI-203-candidate.json",
        },
      });
      expect(
        inspectRunbookContract({ ...inspection, contract })
      ).toContainEqual(
        expect.objectContaining({ invariant: "accepted-handoff" })
      );
    })
  );

  test.effect("rejects stale or hash-mismatched accepted proof", () =>
    Effect.gen(function* () {
      const inspection = yield* validInspection;
      const hgi203Validation = yield* decodeValidation({
        ...hgi203ValidationJson,
        candidate: {
          ...hgi203ValidationJson.candidate,
          acceptedSummarySha256: "0".repeat(64),
        },
      });
      expect(
        inspectRunbookContract({ ...inspection, hgi203Validation })
      ).toContainEqual(
        expect.objectContaining({ invariant: "accepted-handoff" })
      );
    })
  );

  test.effect(
    "rejects substituting the evolving current journey owner for the historical HGI-203 snapshot",
    () =>
      Effect.gen(function* () {
        const inspection = yield* validInspection;
        expect(
          inspectRunbookContract({
            ...inspection,
            historicalJourneyInventorySha256: `sha256:${"0".repeat(64)}`,
          })
        ).toContainEqual(
          expect.objectContaining({
            invariant: "accepted-handoff",
            target: "docs/evidence/releases/HGI-203-local.json",
          })
        );
      })
  );

  test.effect("rejects sidecar and runbook prose divergence", () =>
    Effect.gen(function* () {
      const inspection = yield* validInspection;
      const first = Array.head(inspection.contract.runbooks).pipe(
        Option.getOrElse(() => expect.unreachable())
      );
      const files = HashMap.fromIterable([
        ...inspection.files,
        [
          first.path,
          runbookMarkdown(first).replace(
            `\`${Array.head(first.commands).pipe(
              Option.map((command) => command.invocation),
              Option.getOrElse(() => "missing")
            )}\``,
            "`bun run contradictory-command`"
          ),
        ] as const,
      ]);
      expect(inspectRunbookContract({ ...inspection, files })).toContainEqual(
        expect.objectContaining({ invariant: "existing-command" })
      );
    })
  );

  test.effect("rejects extra runbook files and extra index routes", () =>
    Effect.gen(function* () {
      const inspection = yield* validInspection;
      const files = HashMap.fromIterable([
        ...inspection.files,
        [
          "docs/runbooks/README.md",
          `${HashMap.get(inspection.files, "docs/runbooks/README.md").pipe(Option.getOrElse(() => ""))}\n| \`extra\` | \`docs/runbooks/extra.md\` | \`extra-owner\` |`,
        ] as const,
      ]);
      const findings = inspectRunbookContract({
        ...inspection,
        files,
        runbookPaths: [...inspection.runbookPaths, "docs/runbooks/extra.md"],
      });
      expect(
        Array.filter(
          findings,
          (finding) => finding.invariant === "exact-inventory"
        ).length
      ).toBeGreaterThanOrEqual(2);
    })
  );

  test.effect("rejects swapped authority table fields", () =>
    Effect.gen(function* () {
      const inspection = yield* validInspection;
      const authority = HashMap.get(
        inspection.files,
        "docs/operations/authority-model.md"
      ).pipe(Option.getOrElse(() => ""));
      const files = HashMap.fromIterable([
        ...inspection.files,
        [
          "docs/operations/authority-model.md",
          authority.replace(
            "| `versioning` | `unknown` | `unknown-stop` |",
            "| `versioning` | `unknown-stop` | `unknown` |"
          ),
        ] as const,
      ]);
      expect(inspectRunbookContract({ ...inspection, files })).toContainEqual(
        expect.objectContaining({
          invariant: "authority-stop",
          target: "docs/operations/authority-model.md#versioning",
        })
      );
    })
  );

  test.effect(
    "rejects downgrading version mutation to local-proof authority",
    () =>
      Effect.gen(function* () {
        const inspection = yield* validInspection;
        const contract = yield* decodeContract({
          ...contractJson,
          runbooks: Array.map(contractJson.runbooks, (runbook) => ({
            ...runbook,
            commands: Array.map(runbook.commands, (command) =>
              command.script === "version-repo"
                ? { ...command, requiredAuthority: "local-proof" }
                : command
            ),
          })),
        });
        expect(
          inspectRunbookContract({ ...inspection, contract })
        ).toContainEqual(
          expect.objectContaining({ invariant: "authority-stop" })
        );
      })
  );

  test.effect("rejects flipped accepted-evidence policy", () =>
    Effect.gen(function* () {
      const inspection = yield* validInspection;
      const contract = yield* decodeContract({
        ...contractJson,
        runbooks: Array.map(contractJson.runbooks, (runbook) =>
          runbook.id === "release-readiness"
            ? { ...runbook, acceptedEvidenceRequired: false }
            : runbook
        ),
      });
      expect(
        inspectRunbookContract({ ...inspection, contract })
      ).toContainEqual(
        expect.objectContaining({ invariant: "accepted-handoff" })
      );
    })
  );

  test.effect("rejects an extra mutable attempt detail artifact", () =>
    Effect.gen(function* () {
      const inspection = yield* validInspection;
      const packet = yield* Schema.decodeUnknownEffect(ReleaseProofPacket)({
        ...packetJson,
        attempt: {
          ...packetJson.attempt,
          detailArtifacts: [
            ...packetJson.attempt.detailArtifacts,
            {
              path: "tmp/mutable-detail.json",
              sha256: `sha256:${"0".repeat(64)}`,
            },
          ],
        },
      });
      expect(inspectRunbookContract({ ...inspection, packet })).toContainEqual(
        expect.objectContaining({ invariant: "accepted-handoff" })
      );
    })
  );
});
