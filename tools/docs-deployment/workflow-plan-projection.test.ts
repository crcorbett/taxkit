import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { DocsDeploymentStage } from "@taxkit/infrastructure/stage";
import {
  Array as EffectArray,
  Effect,
  FileSystem,
  HashMap,
  HashSet,
  Option,
  Order,
  Record,
  Result,
  Schema,
} from "effect";
import { sort as sortArray } from "effect/Array";

import {
  DeploymentPlanProjection,
  NativeAppsPlanProjection,
} from "./schemas.js";
import { workflowSha256 } from "./workflow-check.boundary.js";
import {
  AlchemyPlanFixtureManifest,
  alchemyPlanSourceCommit,
  alchemyPlanTextVersion,
  historicalAlchemyPlanSourceCommit,
  historicalAlchemyPlanTextVersion,
  projectAlchemyPlanText,
  projectNativeAppsPlanText,
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
    Schema.check(Schema.isBetweenLength(8, 8))
  ),
});
const TaskLedger = Schema.Struct({
  tasks: Schema.Array(
    Schema.Struct({
      id: Schema.NonEmptyString,
    })
  ),
});
const ExpectedCrosswalk = Schema.Struct({
  owningPaths: Schema.Array(Schema.String),
  proof: Schema.Array(Schema.String),
  requirementId: Schema.String,
  taskId: Schema.String,
  verification: Schema.Array(Schema.String),
});
type ExpectedCrosswalk = typeof ExpectedCrosswalk.Type;

const readFile = (path: string, _encoding: "utf-8") =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fileSystem) => fileSystem.readFileString(path))
  );
const project = projectAlchemyPlanText;
const readManifest = () =>
  readFile(`${fixtureRoot}/manifest.json`, "utf-8").pipe(
    Effect.flatMap(
      Schema.decodeEffect(Schema.fromJsonString(AlchemyPlanFixtureManifest), {
        onExcessProperty: "error",
      })
    )
  );

describe("Alchemy plan projection and historical capture custody", () => {
  test.effect(
    "binds the parser and fixture manifest to the exact dependency source",
    () =>
      Effect.gen(function* () {
        const [manifest, packageSource, lockfileSource] = yield* Effect.all([
          readManifest(),
          readFile(rootPackagePath, "utf-8"),
          readFile(lockfilePath, "utf-8"),
        ]);
        const rootPackage = Schema.decodeUnknownSync(
          Schema.fromJsonString(RootPackageManifest)
        )(packageSource);
        const resolvedAlchemyVersions = EffectArray.flatMap(
          EffectArray.fromIterable(
            lockfileSource.matchAll(
              /"alchemy": \["alchemy@(?<version>[^"]+)"/gu
            )
          ),
          (match) =>
            Option.fromNullishOr(match.groups).pipe(
              Option.flatMap((groups) => Record.get(groups, "version")),
              Option.flatMap(Option.fromNullishOr),
              Option.match({ onNone: () => [], onSome: (version) => [version] })
            )
        );

        expect(alchemyPlanTextVersion).toBe("2.0.0-beta.80");
        expect(alchemyPlanSourceCommit).toBe(
          "ef7d3077a7d196edf26fa1f3bb8bc9b0ef9fef04"
        );
        expect(manifest.alchemyVersion).toBe(historicalAlchemyPlanTextVersion);
        expect(manifest.upstream.commit).toBe(
          historicalAlchemyPlanSourceCommit
        );
        expect(rootPackage.workspaces.catalog.alchemy).toBe(
          alchemyPlanTextVersion
        );
        expect(resolvedAlchemyVersions).toEqual([alchemyPlanTextVersion]);
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "validates all five historical captures and parses the shared action lines",
    () =>
      Effect.gen(function* () {
        const manifest = yield* readManifest();

        const captures = yield* Effect.all(
          EffectArray.map(manifest.captures, (capture) =>
            Effect.gen(function* () {
              const source = yield* readFile(
                `${fixtureRoot}/${capture.fixture}`,
                "utf-8"
              );
              const digest = yield* workflowSha256("workflow-plan", source);
              const projected =
                capture.scenario === "empty-destroy"
                  ? []
                  : yield* project(source, capture.kind);
              const action =
                capture.scenario === "empty-destroy"
                  ? "noop"
                  : EffectArray.get(projected, 0).pipe(
                      Option.map((resource) => resource.action),
                      Option.getOrUndefined
                    );
              return { action, capture, digest, source };
            })
          )
        );

        yield* Effect.forEach(captures, ({ action, capture, digest, source }) =>
          Effect.sync(() => {
            expect(Buffer.byteLength(source)).toBe(capture.finalBytes);
            expect(digest).toBe(capture.finalSha256);
            expect(action).toBe(capture.action);
            if (capture.scenario === "empty-destroy") {
              expect(source).toBe("Plan: no changes\n");
            }
            expect(source).not.toMatch(
              /(?:https?:\/\/|CLOUDFLARE|credential|token|account(?:Id| ID)|\/Users\/|[A-Za-z]:\\\\)/iu
            );
          })
        );

        expect(
          sortArray(Order.String)(
            EffectArray.fromIterable(
              HashSet.fromIterable(
                EffectArray.map(captures, ({ capture }) => capture.scenario)
              )
            )
          )
        ).toEqual(["create", "delete", "empty-destroy", "no-op", "update"]);
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("rejects fixture manifest version drift and excess fields", () =>
    Effect.gen(function* () {
      const source = yield* readFile(`${fixtureRoot}/manifest.json`, "utf-8");
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
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("closes and cross-references all eight accepted findings", () =>
    Effect.gen(function* () {
      const [acceptedSource, taskSource] = yield* Effect.all([
        readFile(acceptedFindingsPath, "utf-8"),
        readFile(taskLedgerPath, "utf-8"),
      ]);
      const accepted = Schema.decodeUnknownSync(
        Schema.fromJsonString(AcceptedFindingsRegister)
      )(acceptedSource);
      const taskLedger = Schema.decodeUnknownSync(
        Schema.fromJsonString(TaskLedger)
      )(taskSource);
      const taskIds = HashSet.fromIterable(
        EffectArray.map(taskLedger.tasks, (task) => task.id)
      );
      const expected = HashMap.fromIterable<string, ExpectedCrosswalk>([
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

      expect(
        HashSet.size(
          HashSet.fromIterable(
            EffectArray.map(accepted.entries, (entry) => entry.findingId)
          )
        )
      ).toBe(8);
      yield* Effect.forEach(accepted.entries, (entry) =>
        Effect.gen(function* () {
          yield* Effect.forEach(entry.proof, (proofPath) =>
            readFile(proofPath, "utf-8").pipe(
              Effect.tap((proof) =>
                Effect.sync(() => expect(proof).not.toHaveLength(0))
              )
            )
          );
          const selected = HashMap.get(expected, entry.findingId);
          expect(Option.isSome(selected)).toBe(true);
          const mapping = yield* Effect.fromOption(selected);
          expect(entry.requirementIds).toEqual([mapping.requirementId]);
          expect(entry.taskIds).toEqual([mapping.taskId]);
          expect(entry.owningPaths).toEqual(mapping.owningPaths);
          expect(entry.verification).toEqual(mapping.verification);
          expect(entry.proof).toEqual(mapping.proof);
          expect(HashSet.has(taskIds, mapping.taskId)).toBe(true);
        })
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "keeps the retired build name out of the current runbook procedure",
    () =>
      Effect.gen(function* () {
        const currentProcedure = yield* readFile(currentRunbookPath, "utf-8");
        const source = yield* readFile(
          "docs/evidence/deployments/retired-docs-operations-2c5ffd40/docs-deployment.md.txt",
          "utf-8"
        );
        const sections = source.split("### Retired history");
        const retiredHistory = yield* Effect.fromOption(
          EffectArray.get(sections, 1)
        );

        expect(source.match(/DocsBuild/gu)).toHaveLength(1);
        expect(currentProcedure).not.toContain("DocsBuild");
        expect(currentProcedure).toContain("retired in this");
        expect(currentProcedure).toContain("retired-docs-operations-2c5ffd40");
        expect(retiredHistory).toContain("history only");
        expect(retiredHistory).toContain("not a current resource");
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("keeps the projection digest in the receipt checker order", () =>
    Effect.gen(function* () {
      const resources = yield* project(
        "Plan: 1 to create\n[DocsWebsite] create\n",
        "deploy"
      );
      const resource = yield* Effect.fromOption(EffectArray.get(resources, 0));
      const projection = yield* Schema.decodeUnknownEffect(
        DeploymentPlanProjection
      )({
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
      const encoded = yield* stringifyWorkflowPlanProjection(projection);
      expect(encoded).toBe(
        `{"candidate":{"deploymentInputSha256":"${"a".repeat(64)}","exactCommit":"${"b".repeat(40)}","lockfileSha256":"${"c".repeat(64)}"},"configSha256":"${"d".repeat(64)}","logicalResources":[{"action":"create","logicalId":"DocsWebsite","resourceType":"Cloudflare.Worker"}],"redaction":{"ansiRemoved":true,"secretValuesIncluded":false,"timestampsExcludedFromDigest":true},"schemaVersion":2,"stack":"TaxKitDocsCloudflare","stage":"prod"}`
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "rejects unknown actions, resources and replacement-like output",
    () =>
      Effect.gen(function* () {
        yield* Effect.all(
          EffectArray.map(
            [
              "Plan: 1 to replace\n[DocsWebsite] replace\n",
              "Plan: 1 to create\n[Unexpected] create\n",
              "Plan: 2 changes\n[DocsWebsite] delete\n[DocsWebsite] create\n",
            ],
            (source) =>
              project(source, "deploy").pipe(
                Effect.result,
                Effect.tap((result) =>
                  Effect.sync(() =>
                    Result.match(result, {
                      onFailure: (error) =>
                        expect(error._tag).toBe("WorkflowPlanProjectionError"),
                      onSuccess: () => expect.unreachable(),
                    })
                  )
                )
              )
          )
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "rejects malformed resource lines and wrong operation actions",
    () =>
      Effect.gen(function* () {
        yield* Effect.all(
          EffectArray.map(
            [
              ["Plan: 1 to update\n[DocsWebsite] update extra\n", "deploy"],
              ["Plan: 1 to create\n[DocsWebsite create\n", "deploy"],
              ["Plan: 1 to delete\n[DocsWebsite] delete\n", "deploy"],
              ["Plan: 1 to update\n[DocsWebsite] update\n", "destroy"],
            ] as const,
            ([source, kind]) =>
              project(source, kind).pipe(
                Effect.result,
                Effect.tap((result) =>
                  Effect.sync(() =>
                    Result.match(result, {
                      onFailure: (error) =>
                        expect(error._tag).toBe("WorkflowPlanProjectionError"),
                      onSuccess: () => expect.unreachable(),
                    })
                  )
                )
              )
          )
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "rejects missing, malformed and inconsistent destroy summaries",
    () =>
      Effect.gen(function* () {
        yield* Effect.all(
          EffectArray.map(
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
            ],
            (source) =>
              project(source, "destroy").pipe(
                Effect.result,
                Effect.tap((result) =>
                  Effect.sync(() =>
                    Result.match(result, {
                      onFailure: (error) =>
                        expect(error._tag).toBe("WorkflowPlanProjectionError"),
                      onSuccess: () => expect.unreachable(),
                    })
                  )
                )
              )
          )
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "accepts beta.80's exact empty-resource summary only for destroy",
    () =>
      Effect.gen(function* () {
        expect(yield* project("Plan: no resources\n", "destroy")).toEqual([
          {
            action: "noop",
            logicalId: "DocsWebsite",
            resourceType: "Cloudflare.Worker",
          },
        ]);
        const rejected = yield* project("Plan: no resources\n", "deploy").pipe(
          Effect.result
        );
        Result.match(rejected, {
          onFailure: (error) =>
            expect(error._tag).toBe("WorkflowPlanProjectionError"),
          onSuccess: () => expect.unreachable(),
        });
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "normalises beta.80 ANSI and timestamp log variation without admitting it",
    () =>
      Effect.gen(function* () {
        expect(
          yield* project(
            "Plan: 1 to update\n\u001B[32m[DocsWebsite] update\u001B[0m\n[12:34:56.789] INFO update available\n",
            "deploy"
          )
        ).toEqual([
          {
            action: "update",
            logicalId: "DocsWebsite",
            resourceType: "Cloudflare.Worker",
          },
        ]);
        expect(
          yield* project(
            "[09:28:11.043] INFO (#1): Loading state\n[09:28:11.043] INFO (#1): Plan: 1 to create\n[09:28:11.043] INFO (#1): [DocsWebsite] create\n",
            "deploy"
          )
        ).toEqual([
          {
            action: "create",
            logicalId: "DocsWebsite",
            resourceType: "Cloudflare.Worker",
          },
        ]);
        const rejected = yield* project(
          "[09:28:11.043] INFO (#1): Plan: 1 to create\n[09:28:11.043] INFO (#1): [DocsWebsite] create\n[09:28:11.043] INFO (#1): [Unexpected] create\n",
          "deploy"
        ).pipe(Effect.result);
        Result.match(rejected, {
          onFailure: (error) =>
            expect(error._tag).toBe("WorkflowPlanProjectionError"),
          onSuccess: () => expect.unreachable(),
        });
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect.each([
    [
      "mismatched native action summary",
      "Plan: 1 to create\n[DocsWebsite] update\n",
    ],
    [
      "a timestamped extra resource",
      "[01:02:03] INFO (#1): Plan: 1 to delete\n[01:02:03] INFO (#1): [DocsWebsite] delete\n[01:02:03] INFO (#1): [Other] delete\n",
    ],
    [
      "duplicate native teardown resources",
      "Plan: 1 to delete\n[DocsWebsite] delete\n[DocsWebsite] delete\n",
    ],
  ] as const)("refuses %s", ([_name, source]) =>
    project(source, "destroy").pipe(
      Effect.result,
      Effect.tap((result) =>
        Effect.sync(() =>
          Result.match(result, {
            onFailure: (error) =>
              expect(error._tag).toBe("WorkflowPlanProjectionError"),
            onSuccess: () => expect.unreachable(),
          })
        )
      )
    )
  );

  test.effect("preserves CRLF native no-op teardown output", () =>
    Effect.gen(function* () {
      expect(
        yield* project("Plan: 1 to noop\r\n[DocsWebsite] noop\r\n", "destroy")
      ).toEqual([
        {
          action: "noop",
          logicalId: "DocsWebsite",
          resourceType: "Cloudflare.Worker",
        },
      ]);
    })
  );
});

describe("replacement native app plan admission", () => {
  test.effect.each(["preview", "production"] as const)(
    "admits the actual formatter's %s graph",
    (kind) =>
      Effect.gen(function* () {
        const stage = yield* Schema.decodeEffect(DocsDeploymentStage)(
          kind === "preview" ? "pr-214" : "prod"
        );
        const source = yield* readFile(
          `tools/docs-deployment/fixtures/alchemy-beta.80/native-apps-${kind}.txt`,
          "utf-8"
        );
        const plan = yield* projectNativeAppsPlanText(source, stage);
        expect(plan.logicalResources).toHaveLength(kind === "preview" ? 2 : 4);
        expect(plan.bindings).toHaveLength(9);
        expect(
          EffectArray.map(
            plan.logicalResources,
            (resource) => resource.logicalId
          )
        ).toEqual(
          kind === "preview"
            ? ["TaxKitApi", "TaxKitWebsite"]
            : [
                "TaxKitApi",
                "TaxKitProductionDnsSettings",
                "TaxKitProductionZone",
                "TaxKitWebsite",
              ]
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect.each([
    {
      source: "Plan: no changes\n[TaxKitApi] noop\n[TaxKitWebsite] noop\n",
      stage: "pr-214",
    },
    {
      source:
        "Plan: no changes\n[TaxKitApi] noop\n[TaxKitProductionDnsSettings] noop\n[TaxKitProductionZone] noop\n[TaxKitWebsite] noop\n",
      stage: "prod",
    },
  ])("admits native no-change resource rows for $stage", ({ source, stage }) =>
    Effect.gen(function* () {
      const checked = yield* Schema.decodeEffect(DocsDeploymentStage)(stage);
      const plan = yield* projectNativeAppsPlanText(source, checked);
      expect(plan.bindings).toEqual([]);
      expect(
        EffectArray.every(
          plan.logicalResources,
          (entry) => entry.action === "noop"
        )
      ).toBe(true);
    })
  );
  test.effect.each([
    "wrong-summary",
    "duplicate",
    "unknown-resource",
    "unknown-binding",
    "replace",
    "delete",
    "binding-delete",
    "zone-create",
    "production-in-preview",
    "empty",
    "old-stack",
    "local-mode",
  ] as const)("refuses %s without exposing input", (problem) =>
    Effect.gen(function* () {
      const base = yield* readFile(
        "tools/docs-deployment/fixtures/alchemy-beta.80/native-apps-production.txt",
        "utf-8"
      );
      const sources = {
        "binding-delete": base.replace(
          "[TaxKitApi/API_PUBLIC_ORIGIN] create",
          "[TaxKitApi/API_PUBLIC_ORIGIN] unbind"
        ),
        delete: base.replace(
          "[TaxKitWebsite] create",
          "[TaxKitWebsite] delete"
        ),
        duplicate: `${base}[TaxKitWebsite] create\n`,
        empty: "Plan: no resources\n",
        "local-mode": base.replace(
          "[TaxKitApi] create",
          "[TaxKitApi] create (local)"
        ),
        "old-stack": "Plan: 1 to create\n[DocsWebsite] create\n",
        "production-in-preview": base,
        replace: base.replace(
          "[TaxKitWebsite] create",
          "[TaxKitWebsite] replace"
        ),
        "unknown-binding": `${base}[TaxKitApi/private-input-sentinel] create\n`,
        "unknown-resource": `${base}[private-input-sentinel] create\n`,
        "wrong-summary": base.replace("3 to create", "2 to create"),
        "zone-create": base.replace(
          "[TaxKitProductionZone] adopted",
          "[TaxKitProductionZone] create"
        ),
      } as const;
      const stage = yield* Schema.decodeEffect(DocsDeploymentStage)(
        problem === "production-in-preview" ? "pr-214" : "prod"
      );
      const result = yield* projectNativeAppsPlanText(
        Record.get(sources, problem).pipe(
          Option.getOrElse(() => expect.fail("Expected named refusal input"))
        ),
        stage
      ).pipe(Effect.result);
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure._tag).toBe("WorkflowPlanProjectionError");
        expect(String(result.failure)).not.toContain("private-input-sentinel");
      }
      expect(Schema.is(NativeAppsPlanProjection)({ schemaVersion: 2 })).toBe(
        false
      );
    }).pipe(Effect.provide(BunServices.layer))
  );
});
