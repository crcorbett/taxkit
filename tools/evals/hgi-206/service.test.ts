import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import {
  Array,
  Effect,
  HashMap,
  Match,
  Option,
  Path,
  Result,
  Schema,
} from "effect";

import { readHgi206Json } from "./input.boundary.js";
import {
  Candidate,
  Failed,
  FixtureCorpus,
  hgi206Paths,
  JourneyDetail,
  Manifest,
  ObservationCorpus,
  Receipt,
  receiptPaths,
  Results,
  Scenarios,
  expectedEpochSkills,
  forbiddenClaims,
  isPortableSkillSourceId,
} from "./schemas.js";
import {
  isTypedForbiddenClaim,
  renderManifestAggregateSource,
  validateHgi206Evidence,
} from "./service.js";

test("HGI-206 exposes fifteen typed forbidden claims", () => {
  expect(forbiddenClaims).toHaveLength(15);
  expect(Array.every(forbiddenClaims, isTypedForbiddenClaim)).toBe(true);
});

test.effect(
  "HGI-206 source aggregate sorts by ASCII path before rendering hashes",
  () =>
    Effect.gen(function* () {
      const highHash = "f".repeat(64);
      const lowHash = "0".repeat(64);
      const members = [
        { path: "z-source.ts", sha256: lowHash },
        { path: "a-source.ts", sha256: highHash },
      ];
      const hashes = HashMap.fromIterable([
        ["a-source.ts", highHash],
        ["z-source.ts", lowHash],
      ]);
      expect(yield* renderManifestAggregateSource(members, hashes)).toBe(
        `${highHash}  a-source.ts\n${lowHash}  z-source.ts\n`
      );
    })
);

test.effect(
  "rejects a missing manifest hash before rendering aggregate source",
  () =>
    Effect.gen(function* () {
      const result = yield* renderManifestAggregateSource(
        [{ path: "missing-source.ts", sha256: "0".repeat(64) }],
        HashMap.empty<string, string>()
      ).pipe(Effect.result);
      Result.match(result, {
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("Hgi206InvariantError", (failure) => {
              expect(failure.invariant).toBe("manifest-member-hashes");
              expect(failure.target).toBe("missing-source.ts");
            }),
            Match.exhaustive
          ),
        onSuccess: () => expect.unreachable(),
      });
    })
);

test.effect("HGI-206 epoch skill identities are portable logical IDs", () =>
  Effect.gen(function* () {
    expect(
      Array.every(expectedEpochSkills, (skill) =>
        isPortableSkillSourceId(skill.sourceId)
      )
    ).toBe(true);
    const posixHomePath = [
      "",
      "Users",
      "example",
      ".codex",
      "skills",
      "skill",
      "SKILL.md",
    ].join("/");
    const posixHomePrefix = ["", "Users", ""].join("/");

    expect(isPortableSkillSourceId(posixHomePath)).toBe(false);
    const encoded = yield* Schema.encodeEffect(
      Schema.fromJsonString(Candidate.fields.epoch.fields.skills)
    )(expectedEpochSkills);
    expect(encoded).not.toContain(posixHomePrefix);
  })
);

// Policy-only fixtures use retained declared hashes. They are not fresh source proof.
const historicalPolicyFixture = Effect.gen(function* () {
  const path = yield* Path.Path;
  const root = yield* path.fromFileUrl(new URL("../../..", import.meta.url));
  const candidate = yield* readHgi206Json(
    root,
    hgi206Paths.candidate,
    Candidate
  );
  const manifest = yield* readHgi206Json(root, hgi206Paths.manifest, Manifest);
  const failed = yield* readHgi206Json(root, hgi206Paths.failed, Failed);
  const fixtures = yield* readHgi206Json(
    root,
    hgi206Paths.fixtures,
    FixtureCorpus
  );
  const observations = yield* readHgi206Json(
    root,
    hgi206Paths.observations,
    ObservationCorpus
  );
  const results = yield* readHgi206Json(root, hgi206Paths.results, Results);
  const scenarios = yield* readHgi206Json(
    root,
    hgi206Paths.scenarios,
    Scenarios
  );
  const receipts = yield* Effect.forEach(receiptPaths, (target) =>
    readHgi206Json(root, target, Receipt).pipe(
      Effect.map((receipt) => [target, receipt] as const)
    )
  );
  const details = yield* Effect.forEach(receipts, ([, receipt]) =>
    readHgi206Json(root, receipt.detailPath, JourneyDetail).pipe(
      Effect.map((detail) => [receipt.detailPath, detail] as const)
    )
  );
  return {
    candidate,
    changedPathDigest: manifest.changedPathDigest,
    changedPaths: manifest.changedPaths,
    failed,
    fixtures,
    hashes: HashMap.fromIterable([
      ...Array.map(
        manifest.files,
        (member) => [member.path, member.sha256] as const
      ),
      [hgi206Paths.failed, candidate.evidence.failedAttempt.sha256],
      [hgi206Paths.fixtures, candidate.evidence.fixtures.sha256],
      [hgi206Paths.observations, candidate.evidence.observations.sha256],
      [hgi206Paths.results, candidate.evidence.results.sha256],
      ...Array.map(
        candidate.evidence.receipts,
        (receipt) => [receipt.path, receipt.sha256] as const
      ),
      ...Array.map(
        receipts,
        ([, receipt]) => [receipt.detailPath, receipt.detailSha256] as const
      ),
    ]),
    journeyDetails: HashMap.fromIterable(details),
    manifest,
    manifestAggregate: manifest.digest,
    observations,
    receipts: HashMap.fromIterable(receipts),
    results,
    scenarios,
  };
});

test.effect(
  "accepts complete retained policy bindings without claiming current source identity",
  () =>
    Effect.gen(function* () {
      const evidence = yield* historicalPolicyFixture;
      const report = yield* validateHgi206Evidence(evidence);
      expect(report.resultCount).toBe(15);
      expect(report.manifestDigest).toBe(evidence.manifest.digest);
    }).pipe(Effect.provide(BunServices.layer))
);

test.effect.each([
  { defect: "missing-member", invariant: "manifest-member-hashes" },
  {
    defect: "duplicate-observation",
    invariant: "bounded-contradiction-observation",
  },
  { defect: "missing-journey-detail", invariant: "journey-receipt-binding" },
])(
  "rejects $defect with its owning failure identity",
  ({ defect, invariant }) =>
    Effect.gen(function* () {
      const evidence = yield* historicalPolicyFixture;
      const firstMember = Array.head(evidence.manifest.files).pipe(
        Option.getOrElse(() => expect.unreachable())
      );
      const firstObservation = Array.head(
        evidence.observations.observations
      ).pipe(Option.getOrElse(() => expect.unreachable()));
      const firstDetail = Array.head(
        Array.fromIterable(HashMap.keys(evidence.journeyDetails))
      ).pipe(Option.getOrElse(() => expect.unreachable()));
      const changed = Match.value(defect).pipe(
        Match.when("missing-member", () => ({
          ...evidence,
          hashes: HashMap.remove(evidence.hashes, firstMember.path),
        })),
        Match.when("duplicate-observation", () => ({
          ...evidence,
          observations: {
            ...evidence.observations,
            observations: Array.map(
              evidence.observations.observations,
              (observation, index) =>
                index === 1 ? firstObservation : observation
            ),
          },
        })),
        Match.when("missing-journey-detail", () => ({
          ...evidence,
          journeyDetails: HashMap.remove(evidence.journeyDetails, firstDetail),
        })),
        Match.orElse(() => expect.unreachable())
      );
      const result = yield* validateHgi206Evidence(changed).pipe(Effect.result);
      Result.match(result, {
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("Hgi206InvariantError", (failure) => {
              expect(failure.invariant).toBe(invariant);
            }),
            Match.exhaustive
          ),
        onSuccess: () => expect.unreachable(),
      });
    }).pipe(Effect.provide(BunServices.layer))
);
