import { Record } from "effect";

import { GovernanceFinding } from "./schemas.js";
import type {
  AcceptedFindings,
  AuditFindings,
  CanonicalSkillBaseline,
  CriticalJourneyInventory,
  GovernanceInvariant,
  ProductSpecTaskPlan,
  RepositoryHarnessProfile,
  RootPackageManifest,
} from "./schemas.js";

const expectedFindingIds = ["HE-001", "HE-002", "HE-003", "HE-004"];
export const canonicalSkillIds = [
  "alchemy-iac",
  "docs-maintainer",
  "effect-client-wrapper",
  "linear",
  "package-structure",
  "prd-implementer",
  "prd-review",
  "prd-writer",
  "strict-effect-ts",
];
const expectedExtraIds = ["docs-writer", "portless"];
const expectedJourneyIds = [
  "taxkit-calculator-direct",
  "taxkit-sdk-packed",
  "taxkit-http-api",
  "taxkit-docs-runtime",
  "taxkit-release-closure",
];
const requiredExternalBoundaries = [
  "hosted CI",
  "remote Git",
  "registry",
  "release",
  "deployment",
  "provider",
  "public-site",
  "external-consumer",
];
const allowedOverlayPaths = [
  ".agents/skills/docs-maintainer/references/repository-profile.md",
  ".agents/skills/package-structure/references/repository-profile.md",
];
const expectedActiveSpecOwners = ["docs/product-specs/index.md"];
const expectedActivePlanOwners = ["docs/exec-plans/active/README.md"];

export interface TreeObservation {
  readonly entryCount: number;
  readonly treeDigest: string;
}

export interface OverlayObservation {
  readonly path: string;
  readonly sha256: string;
}

export interface LinkObservation {
  readonly name: string;
  readonly target: string;
  readonly type: string;
}

export interface ReferenceObservation {
  readonly source: string;
  readonly target: string;
}

export interface GovernanceObservations {
  readonly canonicalTrees: Readonly<Record<string, TreeObservation>>;
  readonly extraTrees: Readonly<Record<string, TreeObservation>>;
  readonly links: readonly LinkObservation[];
  readonly missingReferences: readonly ReferenceObservation[];
  readonly overlays: readonly OverlayObservation[];
  readonly portablePathFindings: readonly ReferenceObservation[];
}

export interface GovernanceInputs {
  readonly accepted: AcceptedFindings;
  readonly findings: AuditFindings;
  readonly journeys: CriticalJourneyInventory;
  readonly manifest: RootPackageManifest;
  readonly observations: GovernanceObservations;
  readonly profile: RepositoryHarnessProfile;
  readonly receipt: CanonicalSkillBaseline;
  readonly specSource: string;
  readonly tasks: ProductSpecTaskPlan;
}

export const portableTreeMode = (mode: number) => {
  const ownerExecutable = Math.floor(mode / 64) % 2 === 1;
  return ownerExecutable ? 0o755 : 0o644;
};

const finding = (
  invariant: GovernanceInvariant,
  target: string,
  recovery: string
) => new GovernanceFinding({ invariant, recovery, target });

const hasExactMembers = (
  actual: readonly string[],
  expected: readonly string[]
) =>
  actual.length === expected.length &&
  expected.every((member) => actual.includes(member));

const inspectAuditCrosswalk = ({
  accepted,
  findings,
  specSource,
  tasks,
}: Pick<
  GovernanceInputs,
  "accepted" | "findings" | "specSource" | "tasks"
>): readonly GovernanceFinding[] => {
  const findingIds = findings.findings.map((entry) => entry.id);
  const acceptedIds = accepted.entries.map((entry) => entry.findingId);
  const taskIds = new Set(tasks.tasks.map((task) => task.id));
  const invalidEntries = accepted.entries.filter(
    (entry) =>
      !entry.requirementIds.every((id) =>
        specSource.includes(`### \`${id}\``)
      ) ||
      !entry.taskIds.every((id) => taskIds.has(id)) ||
      !entry.taskIds.every((id) =>
        tasks.tasks.some(
          (task) =>
            task.id === id && task.acceptedFindingIds.includes(entry.findingId)
        )
      )
  );

  return hasExactMembers(findingIds, expectedFindingIds) &&
    hasExactMembers(acceptedIds, expectedFindingIds) &&
    invalidEntries.length === 0
    ? []
    : [
        finding(
          "audit-crosswalk",
          "docs/documentation-audit/harness-foundation/accepted-findings.json",
          "Restore exact HE-001 through HE-004 acceptance and valid SPEC requirement/task mappings."
        ),
      ];
};

const inspectProfile = (
  profile: RepositoryHarnessProfile
): readonly GovernanceFinding[] => {
  const commandValues = [
    ...profile.commands.closeout,
    ...profile.commands.documentation,
    ...profile.commands.focused,
    ...profile.commands.skills,
  ];
  return profile.lifecyclePhase === "maintained-harness-governance" &&
    hasExactMembers(profile.owners.activeSpecs, expectedActiveSpecOwners) &&
    hasExactMembers(profile.owners.activePlans, expectedActivePlanOwners) &&
    profile.exceptions.length === 0 &&
    profile.criticalJourneyOwner ===
      "docs/verification/critical-journeys.json" &&
    profile.representativeJobs.length === expectedJourneyIds.length &&
    expectedJourneyIds.every((id) =>
      profile.representativeJobs.some((job) =>
        job.owningPaths.some((owner) => owner.endsWith(`#${id}`))
      )
    ) &&
    commandValues.includes("bun run check:harness-governance") &&
    profile.owners.skills.includes(".agents/skills/") &&
    profile.exclusions.some(
      (entry) => entry.includes("public") && entry.includes("copy")
    )
    ? []
    : [
        finding(
          "repository-profile",
          "docs/verification/repository-harness-profile.json",
          "Restore the maintained TaxKit lifecycle, stable spec/plan index owners, exception-free commands, journeys, and public-copy boundary."
        ),
      ];
};

const inspectTrees = (
  receipt: CanonicalSkillBaseline,
  observations: GovernanceObservations
): readonly GovernanceFinding[] => {
  const receiptSkillIds = Record.keys(receipt.skills);
  const canonicalMismatch =
    !hasExactMembers(receiptSkillIds, canonicalSkillIds) ||
    canonicalSkillIds.some((id) => {
      const expected = receipt.skills[id];
      const actual = observations.canonicalTrees[id];
      return (
        expected === undefined ||
        actual === undefined ||
        expected.entryCount !== actual.entryCount ||
        expected.treeDigest !== actual.treeDigest
      );
    });
  const receiptExtraIds = Record.keys(receipt.extras);
  const { "docs-writer": docsWriter, portless } = receipt.extras;
  const extraMismatch =
    receipt.treeDigestAlgorithm !==
      "sha256(canonical-json(sorted relative entries)); regular file mode normalized to Git-portable 0644 or 0755; allowed overlays excluded and hashed separately" ||
    !hasExactMembers(receiptExtraIds, expectedExtraIds) ||
    docsWriter?.classification !== "taxkit-public-copy-only-extra" ||
    docsWriter.owner !== "taxkit-documentation-owner" ||
    !docsWriter.scope.includes("Public-copy wording only") ||
    portless?.classification !== "taxkit-local-development-tool-extra" ||
    expectedExtraIds.some((id) => {
      const expected = receipt.extras[id];
      const actual = observations.extraTrees[id];
      return (
        expected === undefined ||
        actual === undefined ||
        expected.entryCount !== actual.entryCount ||
        expected.treeDigest !== actual.treeDigest
      );
    });
  return canonicalMismatch || extraMismatch
    ? [
        finding(
          "canonical-skill-tree",
          "tools/skills/canonical-skill-baseline.json",
          "Restore the complete receipted nine-skill baseline and declared local extras."
        ),
      ]
    : [];
};

const inspectOverlays = (
  receipt: CanonicalSkillBaseline,
  observations: GovernanceObservations
): readonly GovernanceFinding[] => {
  const receiptPaths = receipt.allowedOverlays.map((entry) => entry.path);
  const validReceiptPaths = hasExactMembers(receiptPaths, allowedOverlayPaths);
  const validObserved =
    observations.overlays.length === receipt.allowedOverlays.length &&
    observations.overlays.every((actual) =>
      receipt.allowedOverlays.some(
        (expected) =>
          actual.path === expected.path && actual.sha256 === expected.sha256
      )
    );
  return validReceiptPaths && validObserved
    ? []
    : [
        finding(
          "skill-overlay",
          "tools/skills/canonical-skill-baseline.json",
          "Keep only the two receipted TaxKit repository-profile overlays and refresh their hashes intentionally."
        ),
      ];
};

const inspectLinks = (
  receipt: CanonicalSkillBaseline,
  observations: GovernanceObservations
): readonly GovernanceFinding[] => {
  const expectedNames = Record.keys(receipt.claudeLinks);
  const valid =
    expectedNames.length === observations.links.length &&
    expectedNames.every((name) =>
      observations.links.some(
        (link) =>
          link.name === name &&
          link.type === "SymbolicLink" &&
          !link.target.startsWith("/") &&
          link.target === receipt.claudeLinks[name]
      )
    );
  return valid
    ? []
    : [
        finding(
          "claude-link",
          ".claude/skills",
          "Restore every declared link as the exact relative symlink to its repository-local skill."
        ),
      ];
};

const inspectReferences = (
  observations: GovernanceObservations
): readonly GovernanceFinding[] => [
  ...(observations.missingReferences.length === 0
    ? []
    : [
        finding(
          "skill-reference" as const,
          observations.missingReferences[0]?.source ?? ".agents/skills",
          "Restore the referenced repository-local skill member or repair its link."
        ),
      ]),
  ...(observations.portablePathFindings.length === 0
    ? []
    : [
        finding(
          "portable-runtime" as const,
          observations.portablePathFindings[0]?.source ?? ".agents/skills",
          "Remove user-specific absolute runtime dependencies from the local skill."
        ),
      ]),
];

const inspectExternalClaims = ({
  profile,
  receipt,
}: Pick<
  GovernanceInputs,
  "profile" | "receipt"
>): readonly GovernanceFinding[] => {
  const source = [...profile.nonClaims, ...receipt.nonClaims].join(" ");
  return requiredExternalBoundaries.every((boundary) =>
    source.toLowerCase().includes(boundary.toLowerCase())
  )
    ? []
    : [
        finding(
          "external-claim",
          "docs/verification/repository-harness-profile.json",
          "State every external boundary as a non-claim; local validation proves repository state only."
        ),
      ];
};

const inspectJourneys = (
  journeys: CriticalJourneyInventory
): readonly GovernanceFinding[] => {
  const ids = journeys.journeys.map((journey) => journey.id);
  const invalid = journeys.journeys.some(
    (journey) =>
      journey.authority !== "none" ||
      journey.oracle.length === 0 ||
      journey.nonClaims.length === 0
  );
  return hasExactMembers(ids, expectedJourneyIds) && !invalid
    ? []
    : [
        finding(
          "critical-journey",
          "docs/verification/critical-journeys.json",
          "Restore the five retained TaxKit journeys with local authority, owning commands, oracles, and non-claims."
        ),
      ];
};

const inspectVerificationGraph = (
  manifest: RootPackageManifest
): readonly GovernanceFinding[] => {
  const verification = manifest.scripts["verification"] ?? "";
  const occurrences =
    verification.split("bun run check:harness-governance").length - 1;
  return manifest.scripts["check:harness-governance"] !== undefined &&
    manifest.scripts["test:harness-governance"] !== undefined &&
    manifest.scripts["check:harness-governance:types"] !== undefined &&
    occurrences === 1
    ? []
    : [
        finding(
          "repository-profile",
          "package.json#scripts.verification",
          "Expose the focused type, test, and runtime commands and invoke the runtime gate exactly once from verification."
        ),
      ];
};

export const inspectGovernance = (
  inputs: GovernanceInputs
): readonly GovernanceFinding[] =>
  [
    ...inspectAuditCrosswalk(inputs),
    ...inspectProfile(inputs.profile),
    ...inspectTrees(inputs.receipt, inputs.observations),
    ...inspectOverlays(inputs.receipt, inputs.observations),
    ...inspectLinks(inputs.receipt, inputs.observations),
    ...inspectReferences(inputs.observations),
    ...inspectExternalClaims(inputs),
    ...inspectJourneys(inputs.journeys),
    ...inspectVerificationGraph(inputs.manifest),
  ].toSorted((left, right) =>
    `${left.invariant}:${left.target}`.localeCompare(
      `${right.invariant}:${right.target}`
    )
  );
