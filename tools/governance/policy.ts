import { Array as EffectArray, HashSet, Option, Order, Record } from "effect";

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
  "taxkit-native-website",
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
  EffectArray.every(expected, (member) => actual.includes(member));

const inspectAuditCrosswalk = ({
  accepted,
  findings,
  specSource,
  tasks,
}: Pick<
  GovernanceInputs,
  "accepted" | "findings" | "specSource" | "tasks"
>): readonly GovernanceFinding[] => {
  const findingIds = EffectArray.map(findings.findings, (entry) => entry.id);
  const acceptedIds = EffectArray.map(
    accepted.entries,
    (entry) => entry.findingId
  );
  const taskIds = HashSet.fromIterable(
    EffectArray.map(tasks.tasks, (task) => task.id)
  );
  const invalidEntries = EffectArray.filter(
    accepted.entries,
    (entry) =>
      !EffectArray.every(entry.requirementIds, (id) =>
        specSource.includes(`### \`${id}\``)
      ) ||
      !EffectArray.every(entry.taskIds, (id) => HashSet.has(taskIds, id)) ||
      !EffectArray.every(entry.taskIds, (id) =>
        EffectArray.some(
          tasks.tasks,
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
    EffectArray.every(expectedJourneyIds, (id) =>
      EffectArray.some(profile.representativeJobs, (job) =>
        EffectArray.some(job.owningPaths, (owner) => owner.endsWith(`#${id}`))
      )
    ) &&
    commandValues.includes("bun run check:harness-governance") &&
    EffectArray.some(
      profile.exclusions,
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
  return EffectArray.every(requiredExternalBoundaries, (boundary) =>
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
  const ids = EffectArray.map(journeys.journeys, (journey) => journey.id);
  const invalid = EffectArray.some(
    journeys.journeys,
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
          "Restore the six current TaxKit journeys with local authority, owning commands, oracles, and non-claims; preserve historical snapshots separately."
        ),
      ];
};

const inspectVerificationGraph = (
  manifest: RootPackageManifest
): readonly GovernanceFinding[] => {
  const verification = Record.get(manifest.scripts, "verification").pipe(
    Option.getOrElse(() => "")
  );
  const occurrences =
    verification.split("bun run check:harness-governance").length - 1;
  return Option.isSome(
    Record.get(manifest.scripts, "check:harness-governance")
  ) &&
    Option.isSome(Record.get(manifest.scripts, "test:harness-governance")) &&
    Option.isSome(
      Record.get(manifest.scripts, "check:harness-governance:types")
    ) &&
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
  EffectArray.sort(
    [
      ...inspectAuditCrosswalk(inputs),
      ...inspectProfile(inputs.profile),
      ...inspectExternalClaims(inputs),
      ...inspectJourneys(inputs.journeys),
      ...inspectVerificationGraph(inputs.manifest),
    ],
    Order.make<GovernanceFinding>((left, right) => {
      const comparison = `${left.invariant}:${left.target}`.localeCompare(
        `${right.invariant}:${right.target}`
      );
      if (comparison < 0) {
        return -1;
      }
      return comparison > 0 ? 1 : 0;
    })
  );
