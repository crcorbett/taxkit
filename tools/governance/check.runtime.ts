import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Array, Console, Effect, Match } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { readGovernanceJson, repositoryRootFromUrl } from "./input.boundary.js";
import { inspectGovernance } from "./policy.js";
import {
  AcceptedFindings,
  AuditFindings,
  CriticalJourneyInventory,
  GovernanceInputError,
  GovernancePolicyError,
  ProductSpecTaskPlan,
  RepositoryHarnessProfile,
  RootPackageManifest,
} from "./schemas.js";

const repositoryRootUrl = new URL("../..", import.meta.url);
const readText = (repositoryRoot: string, target: string) =>
  Effect.gen(function* readGovernanceText() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* fileSystem
      .readFileString(path.join(repositoryRoot, target))
      .pipe(Effect.mapError(() => new GovernanceInputError({ target })));
  });

export const checkHarnessGovernance = (repositoryRoot: string) =>
  Effect.gen(function* checkHarnessGovernanceProgram() {
    const profile = yield* readGovernanceJson(
      repositoryRoot,
      "docs/verification/repository-harness-profile.json",
      RepositoryHarnessProfile
    );
    const findings = yield* readGovernanceJson(
      repositoryRoot,
      "docs/documentation-audit/harness-foundation/audit-findings.json",
      AuditFindings
    );
    const accepted = yield* readGovernanceJson(
      repositoryRoot,
      "docs/documentation-audit/harness-foundation/accepted-findings.json",
      AcceptedFindings
    );
    const tasks = yield* readGovernanceJson(
      repositoryRoot,
      "docs/product-specs/harness-foundation-improvements.tasks.json",
      ProductSpecTaskPlan
    );
    const journeys = yield* readGovernanceJson(
      repositoryRoot,
      "docs/verification/critical-journeys.json",
      CriticalJourneyInventory
    );
    const manifest = yield* readGovernanceJson(
      repositoryRoot,
      "package.json",
      RootPackageManifest
    );
    const specSource = yield* readText(
      repositoryRoot,
      "docs/product-specs/harness-foundation-improvements.md"
    );
    const inputs = {
      accepted,
      findings,
      journeys,
      manifest,
      profile,
      specSource,
      tasks,
    };
    const policyFindings = inspectGovernance(inputs);
    return yield* Array.match(policyFindings, {
      onEmpty: () => Effect.succeed(inputs),
      onNonEmpty: (nonEmptyFindings) =>
        Effect.fail(new GovernancePolicyError({ findings: nonEmptyFindings })),
    });
  });

const program = Effect.gen(function* harnessGovernanceMain() {
  const repositoryRoot = yield* repositoryRootFromUrl(repositoryRootUrl);
  const result = yield* checkHarnessGovernance(repositoryRoot);
  yield* Console.info(
    `Harness governance passed: findings=${result.accepted.entries.length}; journeys=${result.journeys.journeys.length}.`
  );
}).pipe(
  Effect.tapErrorTag("GovernanceInputError", (error) =>
    Console.error(
      `FAIL [input] target=${error.target}; recovery=repair the repository-local Schema-decoded governance owner.`
    )
  ),
  Effect.tapErrorTag("GovernancePolicyError", (error) =>
    Effect.forEach(error.findings, (finding) =>
      Console.error(
        `FAIL [${finding.invariant}] target=${finding.target}; recovery=${finding.recovery}`
      )
    )
  ),
  Effect.provide(BunServices.layer)
);

Match.value(import.meta.main).pipe(
  Match.when(true, () => BunRuntime.runMain(program)),
  Match.orElse(() => false)
);
