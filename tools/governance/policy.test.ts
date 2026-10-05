import { describe, expect, it } from "bun:test";

import * as BunServices from "@effect/platform-bun/BunServices";
import { Array as EffectArray, Effect, Result, Schema } from "effect";

import { checkHarnessGovernance } from "./check.runtime.js";
import acceptedFixture from "./fixtures/accepted.json";
import adversarialFixture from "./fixtures/adversarial.json";
import { inspectGovernance } from "./policy.js";
import type { GovernanceInputs } from "./policy.js";
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

describe("harness governance policy", () => {
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

  it("rejects false external-state claims", async () => {
    const inputs = await loadAcceptedInputs();
    expectInvariant(
      {
        ...inputs,
        profile: { ...inputs.profile, nonClaims: ["Local checks passed."] },
      },
      "external-claim"
    );
  });

  it("covers every declared adversarial fixture", () => {
    expect(adversarialFixture.cases.map((entry) => entry.id)).toEqual([
      "missing-he-mapping",
      "invalid-profile",
      "false-external-claim",
    ]);
  });
});
