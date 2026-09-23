import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { Effect, Schema } from "effect";

import { DeploymentPlanProjection } from "./schemas.js";
import {
  AlchemyPlanFixtureManifest,
  alchemyPlanSourceCommit,
  alchemyPlanTextVersion,
  historicalAlchemyPlanSourceCommit,
  historicalAlchemyPlanTextVersion,
  projectAlchemyPlanText,
  stringifyWorkflowPlanProjection,
} from "./workflow-plan-projection.js";

const fixtureRoot = "tools/docs-deployment/fixtures/alchemy-beta.64" as const;
const acceptedFindingsPath =
  "docs/documentation-audit/alchemy-deployment-structure/accepted-findings.json" as const;
const taskLedgerPath =
  "docs/product-specs/alchemy-deployment-structure-corrections.tasks.json" as const;
const currentRunbookPath = "docs/runbooks/docs-deployment.md" as const;
const rootPackagePath = "package.json" as const;
const lockfilePath = "bun.lock" as const;

const RootPackageManifest = Schema.Struct({
  workspaces: Schema.Struct({
    catalog: Schema.Struct({
      alchemy: Schema.Literal(alchemyPlanTextVersion),
    }),
  }),
});

const CrosswalkEntry = Schema.Struct({
  findingId: Schema.NonEmptyString,
  nonClaims: Schema.Array(Schema.NonEmptyString).pipe(
    Schema.check(Schema.isNonEmpty())
  ),
  owningPaths: Schema.Array(Schema.NonEmptyString).pipe(
    Schema.check(Schema.isNonEmpty())
  ),
  proof: Schema.Array(Schema.NonEmptyString).pipe(
    Schema.check(Schema.isNonEmpty())
  ),
  requirementIds: Schema.Array(Schema.NonEmptyString).pipe(
    Schema.check(Schema.isNonEmpty())
  ),
  status: Schema.Literal("closed"),
  taskIds: Schema.Array(Schema.NonEmptyString).pipe(
    Schema.check(Schema.isNonEmpty())
  ),
  verification: Schema.Array(Schema.NonEmptyString).pipe(
    Schema.check(Schema.isNonEmpty())
  ),
});
const AcceptedFindingsRegister = Schema.Struct({
  entries: Schema.Array(CrosswalkEntry).pipe(
    Schema.check(Schema.isLengthBetween(8, 8))
  ),
});
const TaskLedger = Schema.Struct({
  tasks: Schema.Array(
    Schema.Struct({
      id: Schema.NonEmptyString,
    })
  ),
});
type ExpectedCrosswalk = Readonly<{
  owningPaths: readonly string[];
  proof: readonly string[];
  requirementId: string;
  taskId: string;
  verification: readonly string[];
}>;

const project = (source: string, kind: "deploy" | "destroy") =>
  Effect.runPromise(projectAlchemyPlanText(source, kind));

const readManifest = async () => {
  const source = await readFile(`${fixtureRoot}/manifest.json`, "utf-8");
  return Schema.decodeUnknownSync(
    Schema.fromJsonString(AlchemyPlanFixtureManifest),
    { onExcessProperty: "error" }
  )(source);
};

describe("Alchemy plan projection and historical capture custody", () => {
  test("binds the parser and fixture manifest to the exact dependency source", async () => {
    const [manifest, packageSource, lockfileSource] = await Promise.all([
      readManifest(),
      readFile(rootPackagePath, "utf-8"),
      readFile(lockfilePath, "utf-8"),
    ]);
    const rootPackage = Schema.decodeUnknownSync(
      Schema.fromJsonString(RootPackageManifest)
    )(packageSource);
    const resolvedAlchemyVersions = [
      ...lockfileSource.matchAll(/"alchemy": \["alchemy@(?<version>[^"]+)"/gu),
    ].flatMap((match) =>
      match.groups?.["version"] === undefined ? [] : [match.groups["version"]]
    );

    expect(alchemyPlanTextVersion).toBe("2.0.0-beta.79");
    expect(alchemyPlanSourceCommit).toBe(
      "473c39591c7993a708199d0ef8f0d38416885dde"
    );
    expect(manifest.alchemyVersion).toBe(historicalAlchemyPlanTextVersion);
    expect(manifest.upstream.commit).toBe(historicalAlchemyPlanSourceCommit);
    expect(rootPackage.workspaces.catalog.alchemy).toBe(alchemyPlanTextVersion);
    expect(resolvedAlchemyVersions).toEqual([alchemyPlanTextVersion]);
  });

  test("validates all five historical captures and parses the shared action lines", async () => {
    const manifest = await readManifest();
    const seen = new Set<string>();

    const captures = await Promise.all(
      manifest.captures.map(async (capture) => {
        const source = await readFile(
          `${fixtureRoot}/${capture.fixture}`,
          "utf-8"
        );
        const digest = createHash("sha256").update(source).digest("hex");
        const projected =
          capture.scenario === "empty-destroy"
            ? []
            : await project(source, capture.kind);
        const action =
          capture.scenario === "empty-destroy" ? "noop" : projected[0]?.action;
        return { action, capture, digest, source };
      })
    );

    for (const { action, capture, digest, source } of captures) {
      seen.add(capture.scenario);
      expect(Buffer.byteLength(source)).toBe(capture.finalBytes);
      expect(digest).toBe(capture.finalSha256);
      expect(action).toBe(capture.action);
      if (capture.scenario === "empty-destroy") {
        expect(source).toBe("Plan: no changes\n");
      }
      expect(source).not.toMatch(
        /(?:https?:\/\/|CLOUDFLARE|credential|token|account(?:Id| ID)|\/Users\/|[A-Za-z]:\\\\)/iu
      );
    }

    expect([...seen].toSorted()).toEqual([
      "create",
      "delete",
      "empty-destroy",
      "no-op",
      "update",
    ]);
  });

  test("rejects fixture manifest version drift and excess fields", async () => {
    const source = await readFile(`${fixtureRoot}/manifest.json`, "utf-8");
    const decode = Schema.decodeUnknownSync(
      Schema.fromJsonString(AlchemyPlanFixtureManifest),
      { onExcessProperty: "error" }
    );

    expect(() =>
      decode(source.replace("2.0.0-beta.64", "2.0.0-beta.65"))
    ).toThrow();
    expect(() =>
      decode(
        source.replace(
          '"schemaVersion": 1,',
          '"schemaVersion": 1, "extra": true,'
        )
      )
    ).toThrow();
  });

  test("closes and cross-references all eight accepted findings", async () => {
    const [acceptedSource, taskSource] = await Promise.all([
      readFile(acceptedFindingsPath, "utf-8"),
      readFile(taskLedgerPath, "utf-8"),
    ]);
    const accepted = Schema.decodeUnknownSync(
      Schema.fromJsonString(AcceptedFindingsRegister)
    )(acceptedSource);
    const taskLedger = Schema.decodeUnknownSync(
      Schema.fromJsonString(TaskLedger)
    )(taskSource);
    const taskIds = new Set(taskLedger.tasks.map((task) => task.id));
    const expected = new Map<string, ExpectedCrosswalk>([
      [
        "ALC-AUD-001",
        {
          owningPaths: [
            ".github/workflows/docs-production.yml",
            "tools/docs-deployment/workflow.contract.test.ts",
            "docs/architecture/deployment.md",
          ],
          proof: [
            "docs/documentation-audit/alchemy-deployment-structure/ADS-001-validation.json",
          ],
          requirementId: "ADS-RQ-001",
          taskId: "ADS-001",
          verification: [
            "bun run test:docs-deployment",
            "static exact-group and cancel-in-progress contract test",
            "bun run verification",
          ],
        },
      ],
      [
        "ALC-AUD-002",
        {
          owningPaths: [
            ".github/workflows/docs-preview.yml",
            ".github/workflows/docs-production.yml",
            "tools/docs-deployment/workflow.contract.test.ts",
          ],
          proof: [
            "docs/documentation-audit/alchemy-deployment-structure/ADS-001-validation.json",
          ],
          requirementId: "ADS-RQ-002",
          taskId: "ADS-001",
          verification: [
            "bun run test:docs-deployment",
            "static no-job-token and exact provider-step allowlist test",
            "bun run verification",
          ],
        },
      ],
      [
        "ALC-AUD-003",
        {
          owningPaths: [
            "tools/docs-deployment/",
            "docs/architecture/deployment.md",
            "docs/runbooks/docs-deployment.md",
          ],
          proof: [
            "docs/documentation-audit/alchemy-deployment-structure/ADS-002-validation.json",
          ],
          requirementId: "ADS-RQ-003",
          taskId: "ADS-002",
          verification: [
            "beta.64 source-bound bootstrap tests",
            "bun run test:docs-deployment",
            "bun run check:docs",
            "bun run check:runbooks",
          ],
        },
      ],
      [
        "ALC-AUD-004",
        {
          owningPaths: [
            "apps/docs/scripts/test-cloudflare-hosted.tsx",
            "apps/docs/README.md",
            "tools/docs-deployment/strict-boundaries.policy.ts",
          ],
          proof: [
            "docs/documentation-audit/alchemy-deployment-structure/ADS-003-validation.json",
          ],
          requirementId: "ADS-RQ-004",
          taskId: "ADS-003",
          verification: [
            "focused malformed-input and interruption tests",
            "bun run --filter=docs test",
            "bun run test:docs-deployment",
            "bun run verification",
          ],
        },
      ],
      [
        "ALC-AUD-005",
        {
          owningPaths: [
            "docs/runbooks/docs-deployment.md",
            "docs/architecture/deployment.md",
            "docs/evidence/deployments/",
          ],
          proof: [
            "docs/documentation-audit/alchemy-deployment-structure/ADS-004-validation.json",
            "docs/evidence/deployments/README.md",
          ],
          requirementId: "ADS-RQ-005",
          taskId: "ADS-004",
          verification: [
            "current-surface DocsBuild exclusion check",
            "bun run check:docs",
            "bun run check:runbooks",
            "bun run check:repository-paths",
          ],
        },
      ],
      [
        "ALC-AUD-R001",
        {
          owningPaths: [
            "tools/docs-deployment/",
            ".github/workflows/docs-preview.yml",
            ".github/workflows/docs-production.yml",
          ],
          proof: [
            "docs/documentation-audit/alchemy-deployment-structure/ADS-002-validation.json",
          ],
          requirementId: "ADS-RQ-006",
          taskId: "ADS-002",
          verification: [
            "typed command unit and contract tests",
            "repeated-shell exclusion check",
            "bun run test:docs-deployment",
            "bun run verification",
          ],
        },
      ],
      [
        "ALC-AUD-R002",
        {
          owningPaths: [
            "tools/docs-deployment/workflow-plan-projection.ts",
            "tools/docs-deployment/workflow-plan-projection.test.ts",
            "tools/docs-deployment/fixtures/alchemy-beta.64/",
          ],
          proof: [
            "tools/docs-deployment/fixtures/alchemy-beta.64/manifest.json",
            "docs/documentation-audit/alchemy-deployment-structure/ADS-004-validation.json",
          ],
          requirementId: "ADS-RQ-007",
          taskId: "ADS-004",
          verification: [
            "fixture provenance and digest validation",
            "create, update, no-op, delete and empty-destroy parser tests",
            "bun run test:docs-deployment",
          ],
        },
      ],
      [
        "ALC-AUD-R003",
        {
          owningPaths: [
            "docs/operations/authority-model.md",
            "docs/runbooks/docs-deployment.md",
            "docs/architecture/deployment.md",
          ],
          proof: [
            "docs/documentation-audit/alchemy-deployment-structure/ADS-001-validation.json",
          ],
          requirementId: "ADS-RQ-008",
          taskId: "ADS-001",
          verification: [
            "manual-lock limitation and sole-writer recovery documentation check",
            "bun run check:docs",
            "bun run check:runbooks",
          ],
        },
      ],
    ]);

    expect(new Set(accepted.entries.map((entry) => entry.findingId)).size).toBe(
      8
    );
    await Promise.all(
      accepted.entries.flatMap((entry) =>
        entry.proof.map((proofPath) =>
          expect(readFile(proofPath, "utf-8")).resolves.not.toHaveLength(0)
        )
      )
    );
    for (const entry of accepted.entries) {
      const mapping = expected.get(entry.findingId);
      expect(mapping).toBeDefined();
      if (mapping === undefined) {
        throw new Error(`missing accepted mapping for ${entry.findingId}`);
      }
      expect(entry.requirementIds).toEqual([mapping.requirementId]);
      expect(entry.taskIds).toEqual([mapping.taskId]);
      expect(entry.owningPaths).toEqual(mapping.owningPaths);
      expect(entry.verification).toEqual(mapping.verification);
      expect(entry.proof).toEqual(mapping.proof);
      expect(taskIds.has(mapping.taskId)).toBe(true);
    }
  });

  test("keeps the retired build name out of the current runbook procedure", async () => {
    const source = await readFile(currentRunbookPath, "utf-8");
    const [currentProcedure, retiredHistory] = source.split(
      "### Retired history"
    );

    expect(source.match(/DocsBuild/gu)).toHaveLength(1);
    expect(currentProcedure).not.toContain("DocsBuild");
    expect(retiredHistory).toContain("history only");
    expect(retiredHistory).toContain("not a current resource");
  });

  test("keeps the projection digest in the receipt checker order", async () => {
    const [resource] = await project(
      "Plan: 1 to create\n[DocsWebsite] create\n",
      "deploy"
    );
    const projection = Schema.decodeUnknownSync(DeploymentPlanProjection)({
      candidate: {
        deploymentInputSha256: "a".repeat(64),
        exactCommit: "b".repeat(40),
        lockfileSha256: "c".repeat(64),
      },
      configSha256: "d".repeat(64),
      logicalResources: [resource],
      redaction: {
        ansiRemoved: true,
        secretValuesIncluded: false,
        timestampsExcludedFromDigest: true,
      },
      schemaVersion: 2,
      stack: "TaxKitDocsCloudflare",
      stage: "prod",
    });
    expect(stringifyWorkflowPlanProjection(projection)).toBe(
      JSON.stringify({
        candidate: {
          deploymentInputSha256: "a".repeat(64),
          exactCommit: "b".repeat(40),
          lockfileSha256: "c".repeat(64),
        },
        configSha256: "d".repeat(64),
        logicalResources: [resource],
        redaction: {
          ansiRemoved: true,
          secretValuesIncluded: false,
          timestampsExcludedFromDigest: true,
        },
        schemaVersion: 2,
        stack: "TaxKitDocsCloudflare",
        stage: "prod",
      })
    );
  });

  test("rejects unknown actions, resources and replacement-like output", async () => {
    await Promise.all(
      [
        "Plan: 1 to replace\n[DocsWebsite] replace\n",
        "Plan: 1 to create\n[Unexpected] create\n",
        "Plan: 2 changes\n[DocsWebsite] delete\n[DocsWebsite] create\n",
      ].map((source) =>
        expect(project(source, "deploy")).rejects.toHaveProperty(
          "_tag",
          "WorkflowPlanProjectionError"
        )
      )
    );
  });

  test("rejects malformed resource lines and wrong operation actions", async () => {
    await Promise.all(
      (
        [
          ["Plan: 1 to update\n[DocsWebsite] update extra\n", "deploy"],
          ["Plan: 1 to create\n[DocsWebsite create\n", "deploy"],
          ["Plan: 1 to delete\n[DocsWebsite] delete\n", "deploy"],
          ["Plan: 1 to update\n[DocsWebsite] update\n", "destroy"],
        ] as const
      ).map(([source, kind]) =>
        expect(project(source, kind)).rejects.toHaveProperty(
          "_tag",
          "WorkflowPlanProjectionError"
        )
      )
    );
  });

  test("rejects missing, malformed and inconsistent destroy summaries", async () => {
    await Promise.all(
      [
        "",
        "completely changed provider output\n",
        "[DocsWebsite create\n",
        "Plan: no changes\n[Unexpected create\n",
        "Plan: no changes\nchanged trailing output\n",
        "Plan: no changes\n[DocsWebsite] delete\n",
        "Plan: 1 to delete\n",
        "Plan: no changes\nPlan: no changes\n",
        "Plan: no changes\n",
      ].map((source) =>
        expect(project(source, "destroy")).rejects.toHaveProperty(
          "_tag",
          "WorkflowPlanProjectionError"
        )
      )
    );
  });

  test("accepts beta.79's exact empty-resource summary only for destroy", async () => {
    await expect(project("Plan: no resources\n", "destroy")).resolves.toEqual([
      {
        action: "noop",
        logicalId: "DocsWebsite",
        resourceType: "Cloudflare.Worker",
      },
    ]);
    await expect(
      project("Plan: no resources\n", "deploy")
    ).rejects.toHaveProperty("_tag", "WorkflowPlanProjectionError");
  });

  test("normalises beta.79 ANSI and timestamp log variation without admitting it", async () => {
    await expect(
      project(
        "Plan: 1 to update\n\u001B[32m[DocsWebsite] update\u001B[0m\n[12:34:56.789] INFO update available\n",
        "deploy"
      )
    ).resolves.toEqual([
      {
        action: "update",
        logicalId: "DocsWebsite",
        resourceType: "Cloudflare.Worker",
      },
    ]);
    await expect(
      project(
        "[09:28:11.043] INFO (#1): Loading state\n[09:28:11.043] INFO (#1): Plan: 1 to create\n[09:28:11.043] INFO (#1): [DocsWebsite] create\n",
        "deploy"
      )
    ).resolves.toEqual([
      {
        action: "create",
        logicalId: "DocsWebsite",
        resourceType: "Cloudflare.Worker",
      },
    ]);
    await expect(
      project(
        "[09:28:11.043] INFO (#1): Plan: 1 to create\n[09:28:11.043] INFO (#1): [DocsWebsite] create\n[09:28:11.043] INFO (#1): [Unexpected] create\n",
        "deploy"
      )
    ).rejects.toHaveProperty("_tag", "WorkflowPlanProjectionError");
  });
});
