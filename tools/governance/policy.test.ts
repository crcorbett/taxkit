import { describe, expect, it } from "bun:test";

import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Array as EffectArray,
  Effect,
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
  Effect.runPromise(
    checkHarnessGovernance(repositoryRoot).pipe(
      Effect.provide(BunServices.layer)
    )
  );

const expectInvariant = (
  inputs: GovernanceInputs,
  expectedInvariant: string
) => {
  expect(
    inspectGovernance(inputs).some(
      (finding) => finding.invariant === expectedInvariant
    )
  ).toBe(true);
};

const replaceCanonicalTree = (
  observations: GovernanceObservations,
  skillId: string,
  tree: TreeObservation | null
): GovernanceObservations => {
  const canonicalTrees: Record<string, TreeObservation> = {};
  for (const id of EffectRecord.keys(observations.canonicalTrees)) {
    if (id !== skillId) {
      const observation = observations.canonicalTrees[id];
      if (observation !== undefined) {
        canonicalTrees[id] = observation;
      }
    }
  }
  if (tree !== null) {
    canonicalTrees[skillId] = tree;
  }
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

  it("accepts the repository and decodes the fixture corpus", async () => {
    const inputs = await loadAcceptedInputs();
    expect(inspectGovernance(inputs)).toEqual([]);
    expect(acceptedFixture.expected.findings).toEqual([
      "HE-001",
      "HE-002",
      "HE-003",
      "HE-004",
    ]);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(GovernanceFixtureCorpus)(adversarialFixture)
      )
    ).toBe(true);
  });

  it("rejects a missing HE mapping", async () => {
    const inputs = await loadAcceptedInputs();
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
  });

  it("rejects volatile lifecycle owners and unqualified profile exceptions", async () => {
    const inputs = await loadAcceptedInputs();
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
        Schema.decodeUnknownResult(RepositoryHarnessProfile)(volatileProfile)
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
  });

  it.each(["alchemy-iac", "linear", "strict-effect-ts"])(
    "rejects a missing clean-slate canonical skill: %s",
    async (skillId) => {
      const inputs = await loadAcceptedInputs();
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
    }
  );

  it("rejects partial and stale skill trees", async () => {
    const inputs = await loadAcceptedInputs();
    const observed = inputs.observations.canonicalTrees["prd-writer"];
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
          observed === undefined ? null : { ...observed, treeDigest: "stale" }
        ),
      },
      "canonical-skill-tree"
    );
  });

  it("rejects an unexpected or stale overlay", async () => {
    const inputs = await loadAcceptedInputs();
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
  });

  it("rejects copied and absolute Claude links", async () => {
    const inputs = await loadAcceptedInputs();
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
  });

  it("rejects broken references and user-specific runtime paths", async () => {
    const inputs = await loadAcceptedInputs();
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
  });

  it("rejects false external-state claims", async () => {
    const inputs = await loadAcceptedInputs();
    expectInvariant(
      {
        ...inputs,
        profile: { ...inputs.profile, nonClaims: ["Local checks passed."] },
        receipt: { ...inputs.receipt, nonClaims: ["Local checks passed."] },
      },
      "external-claim"
    );
  });

  it("covers every declared adversarial fixture", () => {
    expect(adversarialFixture.cases.map((entry) => entry.id)).toEqual([
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
