import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import { ConfigProvider, Effect, FileSystem, Result } from "effect";

import { projectWorkflowPlan } from "./workflow-plan-projection.runtime.js";

const planConfig = (directory: string) => ({
  TAXKIT_WORKFLOW_PLAN_CANDIDATE_COMMIT: "a".repeat(40),
  TAXKIT_WORKFLOW_PLAN_CONFIG_SHA256: "b".repeat(64),
  TAXKIT_WORKFLOW_PLAN_DEPLOYMENT_INPUT_SHA256: "c".repeat(64),
  TAXKIT_WORKFLOW_PLAN_KIND: "deploy",
  TAXKIT_WORKFLOW_PLAN_LOCKFILE_SHA256: "d".repeat(64),
  TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH: `${directory}/projection.json`,
  TAXKIT_WORKFLOW_PLAN_STAGE: "pr-24",
  TAXKIT_WORKFLOW_PLAN_TEXT_PATH: `${directory}/plan.txt`,
});

test.effect.each([
  [
    "configuration",
    "workflow plan projection requires the candidate, digest, stage and plan paths",
  ],
  ["read", "could not read the beta.80 Alchemy plan output"],
  ["write", "could not write the workflow plan projection"],
] as const)("returns a safe typed %s failure", ([problem, reason]) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-plan-command-",
    });
    const base = planConfig(directory);
    yield* fileSystem.writeFileString(
      base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH,
      "Plan: 1 to create\n[DocsWebsite] create\n"
    );
    const config = {
      ...base,
      TAXKIT_WORKFLOW_PLAN_KIND:
        problem === "configuration"
          ? "invalid-sentinel-value"
          : base.TAXKIT_WORKFLOW_PLAN_KIND,
      TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH:
        problem === "write"
          ? directory
          : base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH,
      TAXKIT_WORKFLOW_PLAN_TEXT_PATH:
        problem === "read"
          ? `${directory}/missing.txt`
          : base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH,
    };
    const result = yield* projectWorkflowPlan.pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown(config)
      ),
      Effect.result
    );
    Result.match(result, {
      onFailure: (error) => {
        expect(error._tag).toBe("WorkflowPlanProjectionError");
        expect(error).toHaveProperty("reason", reason);
        expect(String(error)).not.toContain("invalid-sentinel-value");
        expect(String(error)).not.toContain(directory);
      },
      onSuccess: () => expect.unreachable(),
    });
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);
