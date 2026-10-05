import { GovernanceFinding } from "./schemas.js";
import type {
  AcceptedFindings,
  AuditFindings,
  CriticalJourneyInventory,
  GovernanceInvariant,
  ProductSpecTaskPlan,
  RepositoryHarnessProfile,
  RootPackageManifest,
} from "./schemas.js";

const expectedFindingIds = ["HE-001", "HE-002", "HE-003", "HE-004"];
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
const expectedActiveSpecOwners = ["docs/product-specs/index.md"];
const expectedActivePlanOwners = ["docs/exec-plans/active/README.md"];

export interface GovernanceInputs {
  readonly accepted: AcceptedFindings;
  readonly findings: AuditFindings;
  readonly journeys: CriticalJourneyInventory;
  readonly manifest: RootPackageManifest;
  readonly profile: RepositoryHarnessProfile;
  readonly specSource: string;
  readonly tasks: ProductSpecTaskPlan;
}

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

const inspectExternalClaims = ({
  profile,
}: Pick<GovernanceInputs, "profile">): readonly GovernanceFinding[] => {
  const source = profile.nonClaims.join(" ");
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
    ...inspectExternalClaims(inputs),
    ...inspectJourneys(inputs.journeys),
    ...inspectVerificationGraph(inputs.manifest),
  ].toSorted((left, right) =>
    `${left.invariant}:${left.target}`.localeCompare(
      `${right.invariant}:${right.target}`
    )
  );
