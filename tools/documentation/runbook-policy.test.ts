import { describe, expect, test } from "bun:test";

import {
  ReleaseAcceptedAttemptSummary,
  ReleaseJourneyInventory,
  ReleaseProofPacket,
} from "@taxkit/scripts/release-readiness";
import { Effect, Record as EffectRecord, Schema } from "effect";

import hgi203ValidationJson from "../../docs/documentation-audit/HGI-203-validation.json";
import acceptedSummaryJson from "../../docs/evidence/releases/HGI-203-accepted-attempt.json";
import packetJson from "../../docs/evidence/releases/HGI-203-local.json";
import journeyInventoryJson from "../../docs/verification/critical-journeys.json";
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

const decodeContract = (value: unknown) =>
  Effect.runPromise(
    Schema.decodeUnknownEffect(RunbookContract, {
      onExcessProperty: "error",
    })(value)
  );

const decodeValidation = (value: unknown) =>
  Effect.runPromise(
    Schema.decodeUnknownEffect(Hgi203ValidationProjection)(value)
  );

const runbookMarkdown = (
  runbook: RunbookInspection["contract"]["runbooks"][number],
  emptySection?: (typeof sectionNames)[number]
) => {
  const sections = sectionNames.flatMap((section) => {
    let body = `${section} has an explicit contract.`;
    if (section === "Preconditions") {
      body = runbook.evidencePaths
        .map((path) => `Required evidence: \`${path}\`.`)
        .join("\n");
    } else if (section === "Procedure") {
      body = runbook.commands
        .map((command) => `Run \`${command.invocation}\`.`)
        .join("\n");
    } else if (section === "Stop conditions") {
      body = runbook.stopOperations
        .map((operation) => `Stop \`${operation}\`.`)
        .join("\n");
    }
    return [`## ${section}`, section === emptySection ? "" : body];
  });
  return [`Owner: \`${runbook.owner}\``, ...sections].join("\n\n");
};

const validInspection = async (): Promise<RunbookInspection> => {
  const [contract, packet, acceptedSummary, hgi203Validation] =
    await Promise.all([
      decodeContract(contractJson),
      Effect.runPromise(
        Schema.decodeUnknownEffect(ReleaseProofPacket)(packetJson)
      ),
      Effect.runPromise(
        Schema.decodeUnknownEffect(ReleaseAcceptedAttemptSummary)(
          acceptedSummaryJson
        )
      ),
      decodeValidation(hgi203ValidationJson),
      Effect.runPromise(
        Schema.decodeUnknownEffect(ReleaseJourneyInventory)(
          journeyInventoryJson
        )
      ),
    ]);
  const files = new Map<string, string>();
  for (const runbook of contract.runbooks) {
    files.set(runbook.path, runbookMarkdown(runbook));
    for (const evidencePath of runbook.evidencePaths) {
      files.set(evidencePath, "retained evidence");
    }
  }
  files.set(
    "docs/runbooks/README.md",
    contract.runbooks
      .map(
        (runbook) =>
          `| \`${runbook.id}\` | \`${runbook.path}\` | \`${runbook.owner}\` |`
      )
      .join("\n")
  );
  files.set(
    "docs/operations/authority-model.md",
    contract.authorityStops
      .map(
        (entry) =>
          `| \`${entry.operation}\` | \`${entry.principal}\` | \`${entry.status}\` | receipt |`
      )
      .join("\n")
  );
  for (const handoffPath of EffectRecord.values(contract.acceptedHandoff)) {
    files.set(handoffPath, "retained evidence");
  }
  return {
    acceptedSummary,
    acceptedSummarySha256:
      packet.attempt.detailArtifacts[0]?.sha256 ?? "missing",
    contentManifestSha256: `sha256:${hgi203Validation.candidate.contentManifestSha256.replace(/^sha256:/u, "")}`,
    contract,
    files,
    hgi203Validation,
    journeyInventorySha256: packet.journeyInventorySha256,
    packet,
    packetSha256: `sha256:${hgi203Validation.candidate.packetSha256.replace(/^sha256:/u, "")}`,
    rootScripts: new Set([
      "changeset",
      "release:check",
      "release:present",
      "test:release-readiness",
      "verification",
      "version-repo",
    ]),
    runbookPaths: [
      "docs/runbooks/README.md",
      ...contract.runbooks.map((runbook) => runbook.path),
    ],
    workspaceScripts: new Map([
      [
        "@taxkit/sdk",
        new Set(["check-packed-artifact", "validate:downstream"]),
      ],
    ]),
  };
};

describe("runbook policy", () => {
  test("accepts the strict four-runbook contract and parses a substantive final section", async () => {
    const inspection = await validInspection();
    expect(inspectRunbookContract(inspection)).toEqual([]);
    expect(ReleaseProofPacket).toBeDefined();
    expect(ReleaseAcceptedAttemptSummary).toBeDefined();
    expect(ReleaseJourneyInventory).toBeDefined();
  });

  test("rejects unknown-principal authority drift", async () => {
    const inspection = await validInspection();
    const contract = await decodeContract({
      ...contractJson,
      authorityStops: contractJson.authorityStops.map((entry, index) =>
        index === 0
          ? { ...entry, principal: "unrecorded-person", status: "approved" }
          : entry
      ),
    });
    const findings = inspectRunbookContract({ ...inspection, contract });
    expect(findings).toContainEqual(
      expect.objectContaining({ invariant: "authority-stop" })
    );
  });

  test("rejects nonexistent commands with exact target and recovery", async () => {
    const inspection = await validInspection();
    const contract = await decodeContract({
      ...contractJson,
      runbooks: contractJson.runbooks.map((runbook, index) =>
        index === 0
          ? {
              ...runbook,
              commands: runbook.commands.map((command, commandIndex) =>
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
  });

  for (const [name, argv] of [
    ["missing bun run prefix", ["bun", "changeset", "status", "--verbose"]],
    [
      "wrong executable prefix",
      ["npm", "run", "changeset", "status", "--verbose"],
    ],
    ["missing documented script arguments", ["bun", "run", "changeset"]],
  ] as const) {
    test(`rejects ${name}`, async () => {
      const inspection = await validInspection();
      const contract = await decodeContract({
        ...contractJson,
        runbooks: contractJson.runbooks.map((runbook) => ({
          ...runbook,
          commands: runbook.commands.map((command) =>
            command.script === "changeset" ? { ...command, argv } : command
          ),
        })),
      });
      expect(
        inspectRunbookContract({ ...inspection, contract })
      ).toContainEqual(
        expect.objectContaining({ invariant: "existing-command" })
      );
    });
  }

  test("rejects duplicate owners", async () => {
    const inspection = await validInspection();
    const duplicateOwner = contractJson.runbooks[0]?.owner ?? "missing";
    const contract = await decodeContract({
      ...contractJson,
      runbooks: contractJson.runbooks.map((runbook, index) =>
        index === 1 ? { ...runbook, owner: duplicateOwner } : runbook
      ),
    });
    expect(inspectRunbookContract({ ...inspection, contract })).toContainEqual(
      expect.objectContaining({ invariant: "unique-owner" })
    );
  });

  for (const missing of ["Rollback", "Escalation"] as const) {
    test(`rejects an empty ${missing.toLowerCase()} section`, async () => {
      const inspection = await validInspection();
      const [first] = inspection.contract.runbooks;
      if (!first) {
        expect.unreachable();
      }
      const files = new Map([
        ...inspection.files,
        [first.path, runbookMarkdown(first, missing)] as const,
      ]);
      expect(inspectRunbookContract({ ...inspection, files })).toContainEqual(
        expect.objectContaining({
          invariant: "required-section",
          target: expect.stringContaining(missing.toLowerCase()),
        })
      );
    });
  }

  test("rejects candidate or tmp proof substitution", async () => {
    const inspection = await validInspection();
    const contract = await decodeContract({
      ...contractJson,
      acceptedHandoff: {
        ...contractJson.acceptedHandoff,
        packet: "tmp/HGI-203-candidate.json",
      },
    });
    expect(inspectRunbookContract({ ...inspection, contract })).toContainEqual(
      expect.objectContaining({ invariant: "accepted-handoff" })
    );
  });

  test("rejects stale or hash-mismatched accepted proof", async () => {
    const inspection = await validInspection();
    const hgi203Validation = await decodeValidation({
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
  });

  test("rejects sidecar and runbook prose divergence", async () => {
    const inspection = await validInspection();
    const [first] = inspection.contract.runbooks;
    if (!first) {
      expect.unreachable();
    }
    const files = new Map([
      ...inspection.files,
      [
        first.path,
        runbookMarkdown(first).replace(
          `\`${first.commands[0]?.invocation}\``,
          "`bun run contradictory-command`"
        ),
      ] as const,
    ]);
    expect(inspectRunbookContract({ ...inspection, files })).toContainEqual(
      expect.objectContaining({ invariant: "existing-command" })
    );
  });

  test("rejects extra runbook files and extra index routes", async () => {
    const inspection = await validInspection();
    const files = new Map([
      ...inspection.files,
      [
        "docs/runbooks/README.md",
        `${inspection.files.get("docs/runbooks/README.md")}\n| \`extra\` | \`docs/runbooks/extra.md\` | \`extra-owner\` |`,
      ] as const,
    ]);
    const findings = inspectRunbookContract({
      ...inspection,
      files,
      runbookPaths: [...inspection.runbookPaths, "docs/runbooks/extra.md"],
    });
    expect(
      findings.filter((finding) => finding.invariant === "exact-inventory")
        .length
    ).toBeGreaterThanOrEqual(2);
  });

  test("rejects swapped authority table fields", async () => {
    const inspection = await validInspection();
    const authority =
      inspection.files.get("docs/operations/authority-model.md") ?? "";
    const files = new Map([
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
  });

  test("rejects downgrading version mutation to local-proof authority", async () => {
    const inspection = await validInspection();
    const contract = await decodeContract({
      ...contractJson,
      runbooks: contractJson.runbooks.map((runbook) => ({
        ...runbook,
        commands: runbook.commands.map((command) =>
          command.script === "version-repo"
            ? { ...command, requiredAuthority: "local-proof" }
            : command
        ),
      })),
    });
    expect(inspectRunbookContract({ ...inspection, contract })).toContainEqual(
      expect.objectContaining({ invariant: "authority-stop" })
    );
  });

  test("rejects flipped accepted-evidence policy", async () => {
    const inspection = await validInspection();
    const contract = await decodeContract({
      ...contractJson,
      runbooks: contractJson.runbooks.map((runbook) =>
        runbook.id === "release-readiness"
          ? { ...runbook, acceptedEvidenceRequired: false }
          : runbook
      ),
    });
    expect(inspectRunbookContract({ ...inspection, contract })).toContainEqual(
      expect.objectContaining({ invariant: "accepted-handoff" })
    );
  });

  test("rejects an extra mutable attempt detail artifact", async () => {
    const inspection = await validInspection();
    const packet = await Effect.runPromise(
      Schema.decodeUnknownEffect(ReleaseProofPacket)({
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
      })
    );
    expect(inspectRunbookContract({ ...inspection, packet })).toContainEqual(
      expect.objectContaining({ invariant: "accepted-handoff" })
    );
  });
});
