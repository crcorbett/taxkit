import { Array as EffectArray, HashSet, Option, Order, Record } from "effect";

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
    profile.owners.skills.includes(".agents/skills/") &&
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

const inspectTrees = (
  receipt: CanonicalSkillBaseline,
  observations: GovernanceObservations
): readonly GovernanceFinding[] => {
  const receiptSkillIds = Record.keys(receipt.skills);
  const canonicalMismatch =
    !hasExactMembers(receiptSkillIds, canonicalSkillIds) ||
    EffectArray.some(canonicalSkillIds, (id) =>
      Option.zipWith(
        Record.get(receipt.skills, id),
        Record.get(observations.canonicalTrees, id),
        (expected, actual) =>
          expected.entryCount !== actual.entryCount ||
          expected.treeDigest !== actual.treeDigest
      ).pipe(Option.getOrElse(() => true))
    );
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
    EffectArray.some(expectedExtraIds, (id) =>
      Option.zipWith(
        Record.get(receipt.extras, id),
        Record.get(observations.extraTrees, id),
        (expected, actual) =>
          expected.entryCount !== actual.entryCount ||
          expected.treeDigest !== actual.treeDigest
      ).pipe(Option.getOrElse(() => true))
    );
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
  const receiptPaths = EffectArray.map(
    receipt.allowedOverlays,
    (entry) => entry.path
  );
  const validReceiptPaths = hasExactMembers(receiptPaths, allowedOverlayPaths);
  const validObserved =
    observations.overlays.length === receipt.allowedOverlays.length &&
    EffectArray.every(observations.overlays, (actual) =>
      EffectArray.some(
        receipt.allowedOverlays,
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
    EffectArray.every(expectedNames, (name) =>
      EffectArray.some(
        observations.links,
        (link) =>
          link.name === name &&
          link.type === "SymbolicLink" &&
          !link.target.startsWith("/") &&
          Option.contains(Record.get(receipt.claudeLinks, name), link.target)
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
          EffectArray.head(observations.missingReferences).pipe(
            Option.map((entry) => entry.source),
            Option.getOrElse(() => ".agents/skills")
          ),
          "Restore the referenced repository-local skill member or repair its link."
        ),
      ]),
  ...(observations.portablePathFindings.length === 0
    ? []
    : [
        finding(
          "portable-runtime" as const,
          EffectArray.head(observations.portablePathFindings).pipe(
            Option.map((entry) => entry.source),
            Option.getOrElse(() => ".agents/skills")
          ),
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
          "Restore the five retained TaxKit journeys with local authority, owning commands, oracles, and non-claims."
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
      ...inspectTrees(inputs.receipt, inputs.observations),
      ...inspectOverlays(inputs.receipt, inputs.observations),
      ...inspectLinks(inputs.receipt, inputs.observations),
      ...inspectReferences(inputs.observations),
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
