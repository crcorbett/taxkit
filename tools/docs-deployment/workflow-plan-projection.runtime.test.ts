import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import {
  ConfigProvider,
  Effect,
  FileSystem,
  Option,
  Record,
  Result,
} from "effect";

import { workflowSha256 } from "./workflow-check.boundary.js";
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

test.effect.each(["pr-214", "prod"] as const)(
  "writes a checked version-three projection for %s",
  (stage) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped({
        prefix: "taxkit-native-plan-command-",
      });
      const base = planConfig(directory);
      const source = yield* fs.readFileString(
        `tools/docs-deployment/fixtures/alchemy-beta.80/native-apps-${stage === "prod" ? "production" : "preview"}.txt`
      );
      yield* fs.writeFileString(base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH, source);
      const digest = yield* projectWorkflowPlan.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            ...base,
            TAXKIT_WORKFLOW_PLAN_ACCOUNT_ID: "f9f94270a4a5af8af7010d891020922d",
            TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256: "e".repeat(64),
            TAXKIT_WORKFLOW_PLAN_GRAPH: "native-apps",
            TAXKIT_WORKFLOW_PLAN_STAGE: stage,
            TAXKIT_WORKFLOW_PLAN_ZONE_ID:
              stage === "prod" ? "15103853342ab9f18f7894b7fae39c39" : undefined,
          })
        )
      );
      const encoded = yield* fs.readFileString(
        base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH
      );
      expect(digest).toBe(yield* workflowSha256("workflow-plan", encoded));
      expect(encoded).toContain('"schemaVersion":3');
      expect(encoded).toContain('"stack":"TaxKitAppsCloudflare"');
      expect(encoded).toContain('"logicalId":"TaxKitApi"');
      expect(encoded).toContain('"logicalId":"TaxKitWebsite"');
      expect(encoded).toContain(`"alchemyPatchSha256":"${"e".repeat(64)}"`);
      if (stage === "prod") {
        expect(encoded).toContain('"removalPolicy":"retain"');
        expect(encoded).toContain(
          '"zoneId":"15103853342ab9f18f7894b7fae39c39"'
        );
        expect(encoded).toContain(
          '"domains":["taxkit.dev","www.taxkit.dev","api.taxkit.dev"]'
        );
      } else {
        expect(encoded).toContain('"productionDns":"unmanaged"');
        expect(encoded).toContain('"domains":[]');
        expect(encoded).not.toContain("taxkit.dev");
        expect(encoded).not.toContain("TaxKitProductionZone");
      }
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect.each([
  "account",
  "zone",
  "missing-zone",
  "patch",
  "teardown",
  "graph",
] as const)(
  "refuses a native %s input before writing its projection",
  (problem) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped({
        prefix: "taxkit-native-plan-refusal-",
      });
      const base = planConfig(directory);
      yield* fs.writeFileString(
        base.TAXKIT_WORKFLOW_PLAN_TEXT_PATH,
        yield* fs.readFileString(
          "tools/docs-deployment/fixtures/alchemy-beta.80/native-apps-production.txt"
        )
      );
      const result = yield* projectWorkflowPlan.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            ...base,
            TAXKIT_WORKFLOW_PLAN_ACCOUNT_ID:
              problem === "account"
                ? "0".repeat(32)
                : "f9f94270a4a5af8af7010d891020922d",
            TAXKIT_WORKFLOW_PLAN_ALCHEMY_PATCH_SHA256:
              problem === "patch" ? "private-input-sentinel" : "e".repeat(64),
            TAXKIT_WORKFLOW_PLAN_GRAPH:
              problem === "graph" ? "private-input-sentinel" : "native-apps",
            TAXKIT_WORKFLOW_PLAN_KIND:
              problem === "teardown" ? "destroy" : "deploy",
            TAXKIT_WORKFLOW_PLAN_STAGE: "prod",
            TAXKIT_WORKFLOW_PLAN_ZONE_ID: Record.get(
              {
                account: "15103853342ab9f18f7894b7fae39c39",
                graph: "15103853342ab9f18f7894b7fae39c39",
                "missing-zone": undefined,
                patch: "15103853342ab9f18f7894b7fae39c39",
                teardown: "15103853342ab9f18f7894b7fae39c39",
                zone: "0".repeat(32),
              },
              problem
            ).pipe(Option.getOrUndefined),
          })
        ),
        Effect.result
      );
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure._tag).toBe("WorkflowPlanProjectionError");
        expect(String(result.failure)).not.toContain("private-input-sentinel");
        expect(String(result.failure)).not.toContain(directory);
      }
      expect(yield* fs.exists(base.TAXKIT_WORKFLOW_PLAN_PROJECTION_PATH)).toBe(
        false
      );
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);
