import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import {
  Array as EffectArray,
  Effect,
  Option,
  Record as EffectRecord,
  Result,
  Schema,
} from "effect";

import { checkHarnessGovernance } from "./check.runtime.js";
import acceptedFixture from "./fixtures/accepted.json";
import adversarialFixture from "./fixtures/adversarial.json";
import { inspectGovernance, portableTreeMode } from "./policy.js";
import type {
  GovernanceInputs,
  GovernanceObservations,
  TreeObservation,
} from "./policy.js";
import {
  GovernanceFixtureCorpus,
  RepositoryHarnessProfile,
} from "./schemas.js";

const repositoryRoot = new URL("../..", import.meta.url).pathname;
const loadAcceptedInputs = () =>
  checkHarnessGovernance(repositoryRoot).pipe(
    Effect.provide(BunServices.layer)
  );
const expectInvariant = (
  inputs: GovernanceInputs,
  expectedInvariant: string
) => {
  expect(
    EffectArray.some(
      inspectGovernance(inputs),
      (finding) => finding.invariant === expectedInvariant
    )
  ).toBe(true);
};
const replaceCanonicalTree = (
  observations: GovernanceObservations,
  skillId: string,
  tree: TreeObservation | null
): GovernanceObservations => {
  const remaining = EffectRecord.filter(
    observations.canonicalTrees,
    (_, id) => id !== skillId
  );
  const canonicalTrees = Option.fromNullishOr(tree).pipe(
    Option.match({
      onNone: () => remaining,
      onSome: (value) => EffectRecord.set(remaining, skillId, value),
    })
  );
  return { ...observations, canonicalTrees };
};
describe("harness governance policy", () => {
  it("normalizes host permissions to Git-portable tree modes", () => {
    expect(portableTreeMode(0o600)).toBe(0o644);
    expect(portableTreeMode(0o644)).toBe(0o644);
    expect(portableTreeMode(0o654)).toBe(0o644);
    expect(portableTreeMode(0o700)).toBe(0o755);
    expect(portableTreeMode(0o744)).toBe(0o755);
    expect(portableTreeMode(0o755)).toBe(0o755);
  });
  it.effect("accepts the repository and decodes the fixture corpus", () =>
    Effect.gen(function* () {
      const inputs = yield* loadAcceptedInputs();
      expect(inspectGovernance(inputs)).toEqual([]);
      expect(
        EffectArray.map(inputs.journeys.journeys, (journey) => journey.id)
      ).toEqual(acceptedFixture.expected.journeys);
      expect(acceptedFixture.expected.findings).toEqual([
        "HE-001",
        "HE-002",
        "HE-003",
        "HE-004",
      ]);
      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(GovernanceFixtureCorpus)(
            adversarialFixture
          )
        )
      ).toBe(true);
    })
  );
  it.effect("rejects a missing HE mapping", () =>
    Effect.gen(function* () {
      const inputs = yield* loadAcceptedInputs();
      expectInvariant(
        {
          ...inputs,
          accepted: {
            ...inputs.accepted,
            entries: EffectArray.map(inputs.accepted.entries, (entry) =>
              entry.findingId === "HE-001"
                ? { ...entry, taskIds: ["HFI-999"] as const }
                : entry
            ),
          },
        },
        "audit-crosswalk"
      );
    })
  );
  it.effect(
    "rejects volatile lifecycle owners and unqualified profile exceptions",
    () =>
      Effect.gen(function* () {
        const inputs = yield* loadAcceptedInputs();
        const volatileProfile = {
          ...inputs.profile,
          lifecyclePhase: "active-harness-foundation-migration" as const,
          owners: {
            ...inputs.profile.owners,
            activePlans: [
              "docs/exec-plans/active/harness-foundation-improvements.md",
            ] as const,
            activeSpecs: [
              "docs/product-specs/harness-foundation-improvements.md",
              "docs/product-specs/harness-foundation-improvements.tasks.json",
            ] as const,
          },
        };
        const exceptionProfile = {
          ...inputs.profile,
          exceptions: ["unqualified"],
        };
        expect(
          Result.isSuccess(
            Schema.decodeUnknownResult(RepositoryHarnessProfile)(
              volatileProfile
            )
          )
        ).toBe(true);
        expectInvariant(
          { ...inputs, profile: volatileProfile },
          "repository-profile"
        );
        expectInvariant(
          { ...inputs, profile: exceptionProfile },
          "repository-profile"
        );
      })
  );
  it.effect.each(["alchemy-iac", "linear", "strict-effect-ts"])(
    "rejects a missing clean-slate canonical skill: %s",
    (skillId) =>
      Effect.gen(function* () {
        const inputs = yield* loadAcceptedInputs();
        expectInvariant(
          {
            ...inputs,
            observations: replaceCanonicalTree(
              inputs.observations,
              skillId,
              null
            ),
          },
          "canonical-skill-tree"
        );
      })
  );
  it.effect("rejects partial and stale skill trees", () =>
    Effect.gen(function* () {
      const inputs = yield* loadAcceptedInputs();
      const observed = EffectRecord.get("prd-writer")(
        inputs.observations.canonicalTrees
      ).pipe(
        Option.getOrElse(() =>
          expect.fail("Expected canonical prd-writer tree")
        )
      );
      expect(observed).toBeDefined();
      expectInvariant(
        {
          ...inputs,
          observations: replaceCanonicalTree(
            inputs.observations,
            "prd-writer",
            null
          ),
        },
        "canonical-skill-tree"
      );
      expectInvariant(
        {
          ...inputs,
          observations: replaceCanonicalTree(
            inputs.observations,
            "prd-writer",
            { ...observed, treeDigest: "stale" }
          ),
        },
        "canonical-skill-tree"
      );
    })
  );
  it.effect("rejects an unexpected or stale overlay", () =>
    Effect.gen(function* () {
      const inputs = yield* loadAcceptedInputs();
      expectInvariant(
        {
          ...inputs,
          observations: {
            ...inputs.observations,
            overlays: [
              ...inputs.observations.overlays,
              {
                path: ".agents/skills/prd-writer/SKILL.md",
                sha256: "unexpected",
              },
            ],
          },
        },
        "skill-overlay"
      );
    })
  );
  it.effect("rejects copied and absolute Claude links", () =>
    Effect.gen(function* () {
      const inputs = yield* loadAcceptedInputs();
      const [first, ...rest] = inputs.observations.links;
      const absoluteSkillPath = ["", "Users", "example", "skill"].join("/");
      expect(first).toBeDefined();
      if (first === undefined) {
        return;
      }
      expectInvariant(
        {
          ...inputs,
          observations: {
            ...inputs.observations,
            links: [{ ...first, type: "Directory" }, ...rest],
          },
        },
        "claude-link"
      );
      expectInvariant(
        {
          ...inputs,
          observations: {
            ...inputs.observations,
            links: [{ ...first, target: absoluteSkillPath }, ...rest],
          },
        },
        "claude-link"
      );
    })
  );
  it.effect("rejects broken references and user-specific runtime paths", () =>
    Effect.gen(function* () {
      const inputs = yield* loadAcceptedInputs();
      const personalSkillPath = [
        "",
        "Users",
        "example",
        ".agents",
        "skills",
      ].join("/");
      expectInvariant(
        {
          ...inputs,
          observations: {
            ...inputs.observations,
            missingReferences: [
              {
                source: ".agents/skills/docs-maintainer/SKILL.md",
                target: "references/missing.md",
              },
            ],
          },
        },
        "skill-reference"
      );
      expectInvariant(
        {
          ...inputs,
          observations: {
            ...inputs.observations,
            portablePathFindings: [
              {
                source: ".agents/skills/docs-maintainer/SKILL.md",
                target: personalSkillPath,
              },
            ],
          },
        },
        "portable-runtime"
      );
    })
  );
  it.effect("rejects false external-state claims", () =>
    Effect.gen(function* () {
      const inputs = yield* loadAcceptedInputs();
      expectInvariant(
        {
          ...inputs,
          profile: { ...inputs.profile, nonClaims: ["Local checks passed."] },
          receipt: { ...inputs.receipt, nonClaims: ["Local checks passed."] },
        },
        "external-claim"
      );
    })
  );
  it.effect("rejects a missing or substituted current Website journey", () =>
    Effect.gen(function* () {
      const inputs = yield* loadAcceptedInputs();
      const [firstJourney, ...otherJourneys] = inputs.journeys.journeys;
      const [firstJob, ...otherJobs] = inputs.profile.representativeJobs;
      expectInvariant(
        {
          ...inputs,
          journeys: {
            ...inputs.journeys,
            journeys: [
              firstJourney,
              ...EffectArray.filter(
                otherJourneys,
                (journey) => journey.id !== "taxkit-native-website"
              ),
            ],
          },
        },
        "critical-journey"
      );
      expectInvariant(
        {
          ...inputs,
          journeys: {
            ...inputs.journeys,
            journeys: EffectArray.map(inputs.journeys.journeys, (journey) =>
              journey.id === "taxkit-native-website"
                ? { ...journey, id: "taxkit-website-imitation" }
                : journey
            ),
          },
        },
        "critical-journey"
      );
      expectInvariant(
        {
          ...inputs,
          profile: {
            ...inputs.profile,
            representativeJobs: [
              firstJob,
              ...EffectArray.filter(
                otherJobs,
                (job) => job.id !== "TAXKIT-NATIVE-WEBSITE"
              ),
            ],
          },
        },
        "repository-profile"
      );
    })
  );
  it("covers every declared adversarial fixture", () => {
    expect(
      EffectArray.map(adversarialFixture.cases, (entry) => entry.id)
    ).toEqual([
      "missing-he-mapping",
      "invalid-profile",
      "partial-skill-tree",
      "stale-skill-tree",
      "unexpected-overlay",
      "copied-claude-link",
      "absolute-claude-link",
      "missing-reference",
      "false-external-claim",
    ]);
  });
});
