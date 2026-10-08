import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import {
  Array as EffectArray,
  Effect,
  Result,
  Schema,
} from "effect";

import { checkHarnessGovernance } from "./check.runtime.js";
import acceptedFixture from "./fixtures/accepted.json";
import adversarialFixture from "./fixtures/adversarial.json";
import { inspectGovernance } from "./policy.js";
import type {
  GovernanceInputs,
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
describe("harness governance policy", () => {
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
  it.effect("rejects false external-state claims", () =>
    Effect.gen(function* () {
      const inputs = yield* loadAcceptedInputs();
      expectInvariant(
        {
          ...inputs,
          profile: { ...inputs.profile, nonClaims: ["Local checks passed."] },
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
      "false-external-claim",
    ]);
  });
});
