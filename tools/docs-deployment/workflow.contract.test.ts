import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import {
  Array as EffectArray,
  Effect,
  FileSystem,
  Option,
  Record,
} from "effect";

const workflowPaths = {
  preview: ".github/workflows/docs-preview.yml",
  production: ".github/workflows/docs-production.yml",
  receipts: ".github/workflows/docs-deployment-workflow-receipts.yml",
  teardown: ".github/workflows/docs-preview-teardown.yml",
} as const;

const readFile = (path: string, _encoding: "utf-8") =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fileSystem) => fileSystem.readFileString(path))
  );
// These exact writer sources are history. Current stop workflows have their own proof.
const historicalWorkflowPaths: Readonly<Record<string, string>> = {
  ".github/workflows/docs-preview-teardown.yml":
    "docs/evidence/deployments/retired-docs-workflows-2c5ffd40/docs-preview-teardown.yml.txt",
  ".github/workflows/docs-preview.yml":
    "docs/evidence/deployments/retired-docs-workflows-2c5ffd40/docs-preview.yml.txt",
  ".github/workflows/docs-production.yml":
    "docs/evidence/deployments/retired-docs-workflows-2c5ffd40/docs-production.yml.txt",
};
const readWorkflow = (path: string) =>
  Record.get(historicalWorkflowPaths, path).pipe(
    Option.match({
      onNone: () => readFile(path, "utf-8"),
      onSome: (retainedPath) => readFile(retainedPath, "utf-8"),
    })
  );
const workflowRunApiReadback = [
  'run_json="$(gh api "repos/',
  "$",
  "{GITHUB_REPOSITORY}/actions/runs/",
  "$",
  '{SOURCE_RUN_ID}")"',
].join("");
const cacheActionSha = "55cc8345863c7cc4c66a329aec7e433d2d1c52a9";
const cacheRestoreAction = `actions/cache/restore@${cacheActionSha}`;
const cacheSaveAction = `actions/cache/save@${cacheActionSha}`;
const checkoutAction =
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
const dopplerAction =
  "dopplerhq/secrets-fetch-action@451892f16195f9ac360e1a5bcbf0b5fd0e957534";
const dopplerCloudflareTokenBinding = [
  "CLOUDFLARE_API_TOKEN: $",
  "{{ steps.doppler-provider.outputs.CLOUDFLARE_API_TOKEN }}",
].join("");
const dopplerTurboTokenBinding = [
  "TURBO_TOKEN: $",
  "{{ steps.doppler-ci.outputs.TURBO_TOKEN }}",
].join("");

const stepNamesWithBinding = (source: string, binding: string) =>
  EffectArray.flatMap(
    EffectArray.drop(source.split(/^ {6}- name: /mu), 1),
    (block) => {
      const newline = block.indexOf("\n");
      if (newline === -1 || !block.includes(binding)) {
        return [];
      }
      return [block.slice(0, newline)];
    }
  );

describe("retained docs workflow admission and current receipt verifiers", () => {
  test.effect("keeps every deployment workflow exact-SHA and pinned", () =>
    Effect.gen(function* () {
      const sources = yield* Effect.all(
        EffectArray.map(
          [
            workflowPaths.preview,
            workflowPaths.production,
            workflowPaths.teardown,
          ],
          readWorkflow
        )
      );
      yield* Effect.forEach(sources, (source) =>
        Effect.sync(() => {
          expect(source).not.toContain("pull_request_target");
          expect(source).toContain(checkoutAction);
          expect(source).toContain(
            "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6"
          );
          expect(source).toContain(
            "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"
          );
          expect(source).toContain("bun install --frozen-lockfile");
          expect(source).toContain("persist-credentials: false");
        })
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "installs the browser needed by the docs build before provider mutation",
    () =>
      Effect.gen(function* () {
        const sources = yield* Effect.all(
          EffectArray.map(
            [
              workflowPaths.preview,
              workflowPaths.production,
              workflowPaths.teardown,
            ],
            readWorkflow
          )
        );
        yield* Effect.forEach(sources, (source) =>
          Effect.sync(() => {
            expect(source).toContain(
              "apps/docs/node_modules/.bin/playwright install chromium"
            );
            expect(source).not.toContain(
              "apps/docs/node_modules/.bin/playwright install --with-deps chromium"
            );
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "keeps remote, Bun and Chromium caches bounded to live setup",
    () =>
      Effect.gen(function* () {
        const [preview, production, receipts, teardown] = yield* Effect.all([
          readWorkflow(workflowPaths.preview),
          readWorkflow(workflowPaths.production),
          readWorkflow(workflowPaths.receipts),
          readWorkflow(workflowPaths.teardown),
        ]);
        const workflowEntries = [
          ["preview", preview],
          ["production", production],
          ["receipts", receipts],
          ["teardown", teardown],
        ] as const;
        const turboTeamBinding = [
          "TURBO_TEAM: $",
          "{{ vars.TURBO_TEAM }}",
        ].join("");
        const turboTokenBinding = [
          "TURBO_TOKEN: $",
          "{{ secrets.TURBO_TOKEN }}",
        ].join("");
        const bunCacheKeyPrefix = ["bun-packages-$", "{{ runner.os }}-"].join(
          ""
        );
        const playwrightCacheKeyPrefix = [
          "playwright-chromium-$",
          "{{ runner.os }}-",
        ].join("");
        yield* Effect.forEach(workflowEntries, ([, source]) =>
          Effect.sync(() => {
            expect(source).toContain(checkoutAction);
            expect(source).toContain(cacheRestoreAction);
            expect(source).toContain(cacheSaveAction);
            expect(source).toContain('echo "path=$(bun pm cache)"');
            expect(source).toContain(bunCacheKeyPrefix);
            expect(source).not.toContain(
              ["bun-packages-$", "{{ github.event_name }}"].join("")
            );
            expect(source).toContain("hashFiles('.bun-version')");
            expect(source).toContain("hashFiles('bun.lock')");
            expect(source).toContain("bun install --frozen-lockfile");
            expect(source).not.toContain("path: node_modules");
            expect(source.indexOf(cacheRestoreAction)).toBeLessThan(
              source.indexOf("bun install --frozen-lockfile")
            );
            expect(source.indexOf(cacheSaveAction)).toBeGreaterThan(
              source.indexOf("bun install --frozen-lockfile")
            );
            expect(source).toContain(
              "steps.bun-cache-restore.outputs.cache-hit != 'true'"
            );
          })
        );
        yield* Effect.forEach([preview, production, teardown], (source) =>
          Effect.sync(() => {
            expect(source).toContain("TURBO_CACHE: local:rw");
            expect(source).not.toContain(turboTeamBinding);
            expect(source).not.toContain(turboTokenBinding);
          })
        );
        expect(preview.split("TURBO_CACHE: local:rw,remote:rw")).toHaveLength(
          3
        );
        expect(preview).toContain(
          ["TURBO_TEAM: $", "{{ steps.doppler-ci.outputs.TURBO_TEAM }}"].join(
            ""
          )
        );
        expect(preview).toContain(
          ["TURBO_TOKEN: $", "{{ steps.doppler-ci.outputs.TURBO_TOKEN }}"].join(
            ""
          )
        );
        expect(
          production.split("TURBO_CACHE: local:rw,remote:rw")
        ).toHaveLength(5);
        expect(production).toContain(
          ["TURBO_TEAM: $", "{{ steps.doppler-ci.outputs.TURBO_TEAM }}"].join(
            ""
          )
        );
        expect(production).toContain(
          ["TURBO_TOKEN: $", "{{ steps.doppler-ci.outputs.TURBO_TOKEN }}"].join(
            ""
          )
        );
        expect(stepNamesWithBinding(preview, dopplerTurboTokenBinding)).toEqual(
          ["Validate deployment owners", "Build provider-free docs proof"]
        );
        expect(
          stepNamesWithBinding(production, dopplerTurboTokenBinding)
        ).toEqual([
          "Schema-check accepted Preview plan",
          "Schema-check accepted Preview provider and hosted proof",
          "Validate deployment owners",
          "Build provider-free docs proof",
        ]);
        expect(teardown).not.toContain("TURBO_CACHE: local:rw,remote:rw");
        expect(receipts).toContain("TURBO_CACHE: local:rw,remote:rw");
        expect(receipts).toContain(
          ["TURBO_TEAM: $", "{{ steps.doppler-ci.outputs.TURBO_TEAM }}"].join(
            ""
          )
        );
        expect(receipts).toContain(
          ["TURBO_TOKEN: $", "{{ steps.doppler-ci.outputs.TURBO_TOKEN }}"].join(
            ""
          )
        );
        expect(receipts).not.toContain(turboTeamBinding);
        expect(receipts).not.toContain(turboTokenBinding);
        yield* Effect.forEach(workflowEntries, ([name, source]) =>
          Effect.sync(() => {
            const expectedActionCount = name === "receipts" ? 1 : 2;
            expect(source.split(cacheRestoreAction)).toHaveLength(
              expectedActionCount + 1
            );
            expect(source.split(cacheSaveAction)).toHaveLength(
              expectedActionCount + 1
            );
            if (name === "receipts") {
              expect(source).not.toContain("playwright-chromium-");
              return;
            }
            expect(source).toContain(
              'echo "PLAYWRIGHT_BROWSERS_PATH=$RUNNER_TEMP/ms-playwright"'
            );
            expect(source).toContain(playwrightCacheKeyPrefix);
            expect(source).not.toContain(
              ["playwright-chromium-$", "{{ github.event_name }}"].join("")
            );
            expect(source).toContain(
              "steps.playwright-identity.outputs.version"
            );
            expect(source.indexOf("playwright-cache-restore")).toBeLessThan(
              source.indexOf("playwright install chromium")
            );
            expect(source.lastIndexOf(cacheSaveAction)).toBeGreaterThan(
              source.indexOf("playwright install chromium")
            );
            expect(source).toContain(
              "steps.playwright-cache-restore.outputs.cache-hit != 'true'"
            );
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("routes repository checks through cache-safe Turbo tasks", () =>
    Effect.gen(function* () {
      const [packageSource, turboSource, inventoryRuntime, ...workflows] =
        yield* Effect.all([
          readFile(
            "docs/evidence/deployments/retired-docs-operations-2c5ffd40/package.json",
            "utf-8"
          ),
          readFile("turbo.json", "utf-8"),
          readFile("tools/docs-deployment/inventory.runtime.ts", "utf-8"),
          ...EffectArray.map(
            [
              workflowPaths.preview,
              workflowPaths.production,
              workflowPaths.teardown,
            ],
            readWorkflow
          ),
        ]);
      expect(packageSource).toContain(
        '"docs:build": "turbo run build --filter=docs"'
      );
      yield* Effect.forEach(
        [
          "check:docs-deployment-inventory",
          "check:docs-deployment-workflow-proof",
          "check:docs-deployment-workflow-input",
          "check:docs-deployment-workflow-run",
          "check:docs-deployment-workflow-plan",
          "check:docs-deployment-workflow-teardown-proof",
        ],
        (command) =>
          Effect.sync(() => {
            expect(packageSource).toContain(`turbo run //#${command}:task`);
            expect(turboSource).toContain(`"//#${command}:task": {`);
          })
      );
      expect(turboSource.split('"cache": false')).toHaveLength(9);
      expect(turboSource).toContain('"passThroughEnv": ["TAXKIT_*"]');
      expect(turboSource).toContain(
        '"passThroughEnv": ["ALCHEMY_PROFILE", "CLOUDFLARE_*", "TAXKIT_*"]'
      );
      expect(inventoryRuntime).toContain(
        "config.TAXKIT_DOCS_DEPLOYMENT_INVENTORY_REPORT"
      );
      expect(inventoryRuntime.replaceAll(/\s+/gu, "")).toContain(
        "fileSystem.writeFileString(path,output)"
      );
      yield* Effect.forEach(workflows, (workflow) =>
        Effect.sync(() => {
          expect(workflow).toContain(
            "TAXKIT_DOCS_DEPLOYMENT_INVENTORY_REPORT="
          );
          expect(workflow).not.toContain(
            "bun run check:docs-deployment-inventory >"
          );
        })
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "runs the supported mutation-capable state-store bootstrap before inventory",
    () =>
      Effect.gen(function* () {
        const sources = yield* Effect.all(
          EffectArray.map(
            [
              workflowPaths.preview,
              workflowPaths.production,
              workflowPaths.teardown,
            ],
            readWorkflow
          )
        );
        yield* Effect.forEach(sources, (source) =>
          Effect.sync(() => {
            expect(source).toContain(
              'ALCHEMY_PLAIN=1 CI=0 bunx alchemy provider cloudflare bootstrap --profile "$ALCHEMY_PROFILE" --worker-name alchemy-state-store'
            );
            expect(source).not.toContain("bunx alchemy login");
            expect(source).not.toContain("bunx alchemy cloudflare bootstrap");
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "builds provider-free proof and hashes the native Website inputs before mutation",
    () =>
      Effect.gen(function* () {
        const evidenceOwner = yield* readWorkflow(
          "tools/docs-deployment/workflow-evidence.ts"
        );
        const sources = yield* Effect.all(
          EffectArray.map(
            [workflowPaths.preview, workflowPaths.production],
            readWorkflow
          )
        );
        yield* Effect.forEach(sources, (source) =>
          Effect.sync(() => {
            expect(source).toContain("run: bun run docs:build");
            expect(source).toContain("workflow-evidence.runtime.ts");
            expect(source).not.toContain("shasum -a 256");
            expect(source).not.toContain("workflow-plan-projection.runtime.ts");
            expect(source).not.toContain("find apps/docs/dist");
          })
        );
        expect(evidenceOwner).toContain(
          '["ls-files", "-z", "--", ...deploymentInputRoots]'
        );
        expect(evidenceOwner).toContain("stringifyWorkflowPlanProjection");
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "keeps every stage operation behind its exact non-cancellable lock",
    () =>
      Effect.gen(function* () {
        const sources = yield* Effect.all(
          EffectArray.map(
            [workflowPaths.preview, workflowPaths.production],
            readWorkflow
          )
        );
        yield* Effect.forEach(sources, (source) =>
          Effect.sync(() => {
            expect(source).toContain("checks: read");
            expect(source).toContain("cancel-in-progress: false");
            expect(source).not.toContain("inputs.operation == 'plan'");
            expect(source).toContain("CLOUDFLARE_ACCOUNT_ID");
            expect(source).toContain("CLOUDFLARE_API_TOKEN");
            expect(source).toContain(
              'test "$ACCEPTED_PLAN_SHA256" = "$replan_sha256"'
            );
            expect(source).toContain("workflow-evidence.runtime.ts");
            expect(source).not.toContain("unexpected_replan_resources");
            expect(source).toContain("wrangler deployments list");
            expect(source).toContain(
              'bun apps/docs/scripts/test-cloudflare-hosted.tsx > "$RUNNER_TEMP/docs-deployment/hosted-proof.raw.json"'
            );
            expect(source).toContain(
              'TAXKIT_DOCS_HOSTED_PROPAGATION_ATTEMPTS: "6"'
            );
            expect(source).toContain(
              'TAXKIT_DOCS_HOSTED_PROPAGATION_DELAY_MS: "2000"'
            );
            expect(source).toContain(
              'previousVersionId:(if .previousVersionId == "" then null else .previousVersionId end)'
            );
            expect(source).toContain("check:docs-deployment-workflow-proof");
            expect(source).toContain("check:docs-deployment-workflow-plan");
            expect(source).toContain("TAXKIT_WORKFLOW_PLAN_OPERATION");
            expect(source).toContain(
              "TAXKIT_WORKFLOW_EVIDENCE_CANDIDATE_COMMIT"
            );
            expect(source).toContain("hosted-proof.raw.json");
            expect(source).toContain("hosted-proof.json");
            expect(source).toContain("TAXKIT_WORKFLOW_SCREENSHOT_ROOT");
            expect(source).not.toContain("sed -E 's:/*$::'");
            expect(source).toContain("check:docs-deployment-workflow-input");
            expect(source).toContain("workflow-input.json");
            expect(source).not.toContain("Materialize successful");
            expect(source).not.toContain("workflow-run.json");
            expect(source).not.toContain("all_replan_resources");
            expect(source).toContain("docs/evidence/deployments");
            expect(source).toContain("configSha256");
            expect(source).toContain("deploymentInputSha256");
            expect(source).toContain("lockfileSha256");
            expect(source).toContain("TAXKIT_WORKFLOW_EVIDENCE_MODE=replan");
            expect(source).not.toContain("jq -nS --arg accountId");
            expect(source).not.toContain("printf 'TAXKIT_DOCS_");
          })
        );
        const production = yield* readWorkflow(workflowPaths.production);
        expect(production).toContain("group: taxkit-docs-production-prod");
        expect(
          production.split("group: taxkit-docs-production-prod")
        ).toHaveLength(2);
        expect(production).toContain(
          'hosted_rollback_identity="$TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY"'
        );
        expect(production).toContain(
          'hosted_rollback_identity="production-$GITHUB_RUN_ID"'
        );
        expect(production).not.toContain(
          "jq -er '.rollbackRecoveryIdentity' \"$RUNNER_TEMP/docs-deployment/provider-readback.json\""
        );
        expect(production).toContain(
          'env -u TAXKIT_DOCS_PREVIEW_PR_NUMBER \\\n            TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY="$hosted_rollback_identity" \\\n            bun apps/docs/scripts/test-cloudflare-hosted.tsx'
        );
        const teardown = yield* readWorkflow(workflowPaths.teardown);
        expect(teardown).toContain("cancel-in-progress: false");
        expect(teardown).toContain("CLOUDFLARE_ACCOUNT_ID");
        expect(teardown).toContain("CLOUDFLARE_API_TOKEN");
        expect(teardown).toContain("provider-inventory-before.json");
        expect(teardown).toContain("provider-inventory-pre-destroy.json");
        expect(teardown).toContain("provider-inventory-pre-destroy.stderr.txt");
        expect(teardown).toContain(
          "provider-inventory-pre-destroy.attempts.txt"
        );
        expect(teardown).toContain("read_inventory");
        expect(teardown).toContain("inventory_status");
        expect(teardown).toContain("stderr_bytes");
        expect(teardown).toContain("stage_count_before");
        expect(teardown).toContain("workflow-plan-projection.runtime.ts");
        expect(teardown).toContain("destroy-two-projection.json");
        expect(teardown).not.toContain(["Docs", "Build"].join(""));
        expect(teardown).not.toContain(["Command", "Build"].join("."));
        expect(teardown).toContain("dry_run_status");
        expect(teardown).toContain(
          "ALCHEMY_TELEMETRY_DISABLED=1 ALCHEMY_PLAIN=1 CI=1 bun node_modules/alchemy/bin/alchemy.ts destroy --dry-run"
        );
        expect(teardown).toContain(
          "ALCHEMY_TELEMETRY_DISABLED=1 ALCHEMY_PLAIN=1 CI=1 bun node_modules/alchemy/bin/alchemy.ts destroy --stage"
        );
        expect(teardown).toContain(
          ["destroy-", "$", "{attempt}.stderr.txt"].join("")
        );
        expect(teardown).toContain("[REDACTED]");
        expect(teardown).toContain("sleep 5");
        expect(teardown).toContain("providerWorkers");
        expect(teardown).toContain(
          'select(.logicalId == "DocsWebsite" and .workerUrl == $url)'
        );
        expect(teardown).toContain(
          'select(.stage == $stage and .logicalId == "DocsWebsite" and .workerName == $worker)'
        );
        expect(teardown).toContain("provider-readback.json");
        expect(teardown).toContain("providerWorkerAbsent:true");
        expect(teardown).toContain("formerWorkerName");
        expect(teardown).toContain("formerWorkerUrl");
        expect(teardown).toContain("preexistingStage");
        expect(teardown).toContain("pulls/");
        expect(teardown).toContain('= "closed"');
        expect(teardown).toContain("grep -Eq '^[1-9][0-9]*$'");
        expect(teardown).toContain(
          "check:docs-deployment-workflow-teardown-proof"
        );
        expect(teardown).toContain("check:docs-deployment-workflow-input");
        expect(teardown).not.toContain("Materialize successful");
        expect(teardown).toContain(
          "TAXKIT_WORKFLOW_PLAN_OPERATION=preview-destroy"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("limits the Cloudflare token to the exact provider steps", () =>
    Effect.gen(function* () {
      const workflows = [
        {
          allowed: [
            "Run mutation-capable Alchemy state-store bootstrap",
            "Plan exact Preview candidate",
            "Replan and deploy accepted Preview candidate",
          ],
          binding: dopplerCloudflareTokenBinding,
          path: workflowPaths.preview,
        },
        {
          allowed: [
            "Run mutation-capable Alchemy state-store bootstrap",
            "Plan exact fixed Production candidate",
            "Replan and deploy fixed Production candidate",
          ],
          binding: dopplerCloudflareTokenBinding,
          path: workflowPaths.production,
        },
        {
          allowed: [
            "Run mutation-capable Alchemy state-store bootstrap",
            "Equal dry-run and destroy exact Preview stage",
          ],
          binding: dopplerCloudflareTokenBinding,
          path: workflowPaths.teardown,
        },
      ] as const;

      const workflowSources = yield* Effect.all(
        EffectArray.map(workflows, (workflow) =>
          Effect.gen(function* () {
            return { ...workflow, source: yield* readWorkflow(workflow.path) };
          })
        )
      );
      yield* Effect.forEach(workflowSources, ({ allowed, binding, source }) =>
        Effect.sync(() => {
          expect(source).not.toContain(`\n      ${binding}`);
          expect(stepNamesWithBinding(source, binding)).toEqual([...allowed]);
          expect(source.split(binding)).toHaveLength(allowed.length + 1);
        })
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "shares Preview credentials for deploy and exact-stage teardown",
    () =>
      Effect.gen(function* () {
        const [preview, production, teardown] = yield* Effect.all([
          readWorkflow(workflowPaths.preview),
          readWorkflow(workflowPaths.production),
          readWorkflow(workflowPaths.teardown),
        ]);
        expect(preview).toContain("environment: taxkit-docs-preview");
        expect(production).toContain("environment: taxkit-docs-production");
        expect(teardown).toContain("environment: taxkit-docs-preview");
        expect(teardown).not.toContain(
          "environment: taxkit-docs-preview-teardown"
        );
        yield* Effect.forEach([preview, teardown], (source) =>
          Effect.sync(() => {
            expect(source).toContain(dopplerAction);
            expect(source).toContain(
              ["doppler-token: $", "{{ secrets.DOPPLER_PROVIDER_TOKEN }}"].join(
                ""
              )
            );
            expect(source).toContain(
              'test "$DOPPLER_PROJECT" = "taxkit" && test "$DOPPLER_CONFIG" = "stg_preview"'
            );
            expect(source).not.toContain("secrets.CLOUDFLARE");
            expect(source).not.toContain("inject-env-vars");
            expect(source.lastIndexOf(cacheSaveAction)).toBeLessThan(
              source.indexOf(dopplerAction)
            );
          })
        );
        expect(preview).toContain(
          ["doppler-token: $", "{{ secrets.DOPPLER_CI_TOKEN }}"].join("")
        );
        expect(preview.match(/secrets\./gu)).toHaveLength(2);
        expect(teardown.match(/secrets\./gu)).toHaveLength(1);
        expect(teardown).not.toContain("doppler-ci");
        expect(production).toContain(dopplerAction);
        expect(production).toContain(
          ["doppler-token: $", "{{ secrets.DOPPLER_CI_TOKEN }}"].join("")
        );
        expect(production).toContain(
          ["doppler-token: $", "{{ secrets.DOPPLER_PROVIDER_TOKEN }}"].join("")
        );
        expect(production).toContain(
          'test "$DOPPLER_PROJECT" = "taxkit" && test "$DOPPLER_CONFIG" = "ci"'
        );
        expect(production).toContain(
          'test "$DOPPLER_PROJECT" = "taxkit" && test "$DOPPLER_CONFIG" = "prd"'
        );
        expect(production).toContain("environment: taxkit-docs-production");
        expect(production).not.toContain("environment: taxkit-docs-preview\n");
        expect(production).not.toContain(
          'test "$DOPPLER_CONFIG" = "stg_preview"'
        );
        expect(production).not.toContain("secrets.CLOUDFLARE");
        expect(production).not.toContain("inject-env-vars");
        expect(production.match(/secrets\./gu)).toHaveLength(2);
        expect(production.lastIndexOf(cacheSaveAction)).toBeLessThan(
          production.indexOf(dopplerAction)
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("uploads only prepared deployment evidence directories", () =>
    Effect.gen(function* () {
      const [preview, production, teardown] = yield* Effect.all([
        readWorkflow(workflowPaths.preview),
        readWorkflow(workflowPaths.production),
        readWorkflow(workflowPaths.teardown),
      ]);
      expect(preview).toContain("Prepare allowlisted Preview plan evidence");
      expect(preview).toContain("TAXKIT_WORKFLOW_ARTIFACT_MODE: preview-plan");
      expect(preview).toContain(
        "Prepare allowlisted Preview provider evidence"
      );
      expect(preview).toContain(
        "TAXKIT_WORKFLOW_ARTIFACT_MODE: preview-provider"
      );
      expect(preview).toContain(
        ["path: $", "{{ runner.temp }}/docs-preview-plan-upload"].join("")
      );
      expect(preview).toContain(
        ["path: $", "{{ runner.temp }}/docs-preview-provider-upload"].join("")
      );
      expect(preview).not.toContain(
        ["path: $", "{{ runner.temp }}/docs-deployment\n"].join("")
      );
      expect(preview).not.toContain(
        [
          "path: |\n",
          "            $",
          "{{ runner.temp }}/docs-deployment",
        ].join("")
      );
      expect(teardown).toContain(
        "Prepare allowlisted Preview teardown evidence"
      );
      expect(teardown).toContain(
        "TAXKIT_WORKFLOW_ARTIFACT_MODE: preview-teardown"
      );
      expect(teardown).toContain(
        ["path: $", "{{ runner.temp }}/docs-preview-teardown-upload"].join("")
      );
      expect(teardown).not.toContain(
        ["path: $", "{{ runner.temp }}/docs-deployment\n"].join("")
      );
      expect(production).toContain(
        "Prepare allowlisted Production plan evidence"
      );
      expect(production).toContain(
        "TAXKIT_WORKFLOW_ARTIFACT_MODE: production-plan"
      );
      expect(production).toContain(
        "Prepare allowlisted Production provider evidence"
      );
      expect(production).toContain(
        "TAXKIT_WORKFLOW_ARTIFACT_MODE: production-provider"
      );
      expect(production).toContain(
        ["path: $", "{{ runner.temp }}/docs-production-plan-upload"].join("")
      );
      expect(production).toContain(
        ["path: $", "{{ runner.temp }}/docs-production-provider-upload"].join(
          ""
        )
      );
      expect(production).not.toContain(
        ["path: $", "{{ runner.temp }}/docs-deployment\n"].join("")
      );
      expect(production).not.toContain(
        [
          "path: |\n",
          "            $",
          "{{ runner.temp }}/docs-deployment",
        ].join("")
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "uses one non-cancellable Preview deploy and teardown group",
    () =>
      Effect.gen(function* () {
        const [preview, teardown] = yield* Effect.all([
          readWorkflow(workflowPaths.preview),
          readWorkflow(workflowPaths.teardown),
        ]);
        const group = [
          "group: taxkit-docs-preview-pr-",
          "$",
          "{{ github.event.pull_request.number || inputs.pr_number }}",
        ].join("");
        expect(preview).toContain(group);
        expect(teardown).toContain(group);
        expect(preview).toContain("cancel-in-progress: false");
        expect(teardown).toContain("cancel-in-progress: false");
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("keeps the first default-branch bootstrap source-bound", () =>
    Effect.gen(function* () {
      const preview = yield* readWorkflow(workflowPaths.preview);
      expect(preview).toContain(
        'test "$(jq -r .head.sha <<<"$pr_json")" = "$CANDIDATE_SHA"'
      );
      expect(preview).toContain(
        'test "$(jq -r .merged <<<"$pr_json")" = "true"'
      );
      expect(preview).toContain(
        'test "$(jq -r .draft <<<"$pr_json")" = "true"'
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "accepts only a completed exact Quality success and tolerates cancelled reruns",
    () =>
      Effect.gen(function* () {
        const [preview, production] = yield* Effect.all([
          readWorkflow(workflowPaths.preview),
          readWorkflow(workflowPaths.production),
        ]);
        yield* Effect.forEach([preview, production], (source) =>
          Effect.sync(() => {
            expect(source).toContain("quality_runs=");
            expect(source).toContain('all(.[]; .status == "completed")');
            expect(source).toContain('any(.[]; .conclusion == "success")');
            expect(source).toContain(
              'all(.[]; .conclusion == "success" or .conclusion == "cancelled")'
            );
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "binds PR-close teardown to the current default-branch source",
    () =>
      Effect.gen(function* () {
        const teardown = yield* readWorkflow(workflowPaths.teardown);
        const githubExpression = [
          "$",
          "{{ inputs.reviewed_workflow_sha || github.sha }}",
        ].join("");
        expect(teardown).toContain(
          `REVIEWED_WORKFLOW_SHA: ${githubExpression}`
        );
        expect(teardown).not.toContain("github.event.pull_request.base.sha");
        expect(teardown).toContain('test "$GITHUB_REF" = "refs/heads/main"');
        expect(teardown).not.toContain("secrets.CLOUDFLARE_API_TOKEN");
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "binds Production mutation to a Schema-checked Preview workflow receipt",
    () =>
      Effect.gen(function* () {
        const production = yield* readWorkflow(workflowPaths.production);
        expect(production).toContain("accepted_preview_run_id");
        expect(production).toContain(
          "printf '%s' \"$ACCEPTED_PREVIEW_RUN_ID\" | grep -Eq '^[1-9][0-9]*$'"
        );
        expect(production).toContain("accepted_preview_pr_number");
        expect(production).toContain("rollback_expected_current_version_id");
        expect(production).toContain("rollback_recovery_identity");
        expect(production).toContain("actions/runs/");
        expect(production).toContain(
          [
            'preview_run="$(gh api "repos/',
            "$",
            "{GITHUB_REPOSITORY}/actions/runs/",
            "$",
            '{ACCEPTED_PREVIEW_RUN_ID}")"',
          ].join("")
        );
        expect(production).toContain(".head_sha");
        expect(production).toContain(
          [
            "compare/",
            "$",
            "{preview_source_sha}...",
            "$",
            "{GITHUB_SHA}",
          ].join("")
        );
        expect(production).toContain("ahead|identical) ;;");
        expect(production).not.toContain(
          'test "$preview_source_sha" = "$(gh api'
        );
        expect(production).toContain(".head_branch");
        expect(production).toContain(".name");
        expect(production).not.toContain(
          'gh run view "$ACCEPTED_PREVIEW_RUN_ID"'
        );
        expect(production).toContain("gh run download");
        expect(production).toContain("check:docs-deployment-workflow-proof");
        expect(production).toContain("accepted_preview_readback");
        expect(production).toContain(
          "taxkit-docs-preview-$ACCEPTED_PREVIEW_RUN_ID"
        );
        expect(production).toContain("accepted_preview_plan");
        expect(production).toContain("accepted_preview_recovery_identity");
        expect(production).toContain("TAXKIT_WORKFLOW_PLAN_REQUIRE_REPLAN=1");
        expect(production).toContain(
          "TAXKIT_WORKFLOW_PLAN_OPERATION: preview-equal-replan"
        );
        expect(production.indexOf("Check out exact candidate")).toBeLessThan(
          production.indexOf(
            "Schema-check accepted Preview provider and hosted proof"
          )
        );
        expect(production.indexOf("Check out exact candidate")).toBeLessThan(
          production.indexOf('gh run download "$ACCEPTED_PREVIEW_RUN_ID"')
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("keeps teardown promotion strict at the receipt decoder", () =>
    Effect.gen(function* () {
      const [checker, boundary] = yield* Effect.all([
        readFile(
          "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
          "utf-8"
        ),
        readFile("tools/docs-deployment/workflow-check.boundary.ts", "utf-8"),
      ]);
      expect(checker).toContain("readWorkflowReceipt");
      expect(boundary).toContain('onExcessProperty: "error"');
      expect(checker).toContain("providerWorkerAbsent");
      expect(checker).toContain("stateStageAbsent");
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "keeps workflow verifiers behind the shared Effect host boundary",
    () =>
      Effect.gen(function* () {
        const runtimePaths = [
          "tools/docs-deployment/workflow-input-check.runtime.ts",
          "tools/docs-deployment/workflow-plan-check.runtime.ts",
          "tools/docs-deployment/workflow-proof-check.runtime.ts",
          "tools/docs-deployment/workflow-run-check.runtime.ts",
          "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
        ];
        const runtimes = yield* Effect.all(
          EffectArray.map(runtimePaths, (path) => readFile(path, "utf-8"))
        );

        yield* Effect.forEach(runtimes, (source) =>
          Effect.sync(() => {
            expect(source).toContain("Config.schema(");
            expect(source).toContain("readWorkflowReceipt(");
            expect(
              source.includes("BunRuntime.runMain(program)") ||
                source.includes(
                  "BunRuntime.runMain(program, { disableErrorReporting: true })"
                )
            ).toBe(true);
            expect(source).not.toContain("process.env");
            expect(source).not.toContain("Bun.file");
            expect(source).not.toContain("JSON.parse");
            expect(source).not.toContain("Effect.runPromise");
            expect(source).not.toContain("console.");
            expect(source).not.toContain("process.exitCode");
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect(
    "reconciles completed workflow runs outside the triggering run",
    () =>
      Effect.gen(function* () {
        const receipts = yield* readWorkflow(workflowPaths.receipts);
        expect(receipts).toContain("workflow_run:");
        expect(receipts).toContain("types: [completed]");
        expect(receipts).not.toContain("branches: [main]");
        expect(receipts).toContain(workflowRunApiReadback);
        expect(receipts).toContain("TAXKIT_WORKFLOW_RUN_HEAD_SHA");
        expect(receipts).toContain("TAXKIT_WORKFLOW_CHECKOUT_SHA");
        expect(receipts).toContain("git checkout --detach");
        expect(receipts).toContain("workflow-run-candidate.json");
        expect(receipts).toContain("Promote the validated workflow receipt");
        expect(receipts).toContain(
          "if: success() && github.event.workflow_run.conclusion == 'success'"
        );
        expect(receipts).toContain(
          "always() && github.event.workflow_run.conclusion"
        );
        expect(receipts).toContain("workflowCommit:$workflowCommit");
        expect(receipts).toContain("gh run download");
        expect(receipts).toContain("check:docs-deployment-workflow-input");
        expect(receipts).toContain("check:docs-deployment-workflow-run");
        expect(receipts).toContain("workflow-run-failure.json");
        expect(receipts).toContain("actions: read");
        expect(receipts).toContain(dopplerAction);
        expect(receipts).toContain(
          ["doppler-token: $", "{{ secrets.DOPPLER_CI_TOKEN }}"].join("")
        );
        expect(receipts).toContain(
          [
            "DOPPLER_PROJECT: $",
            "{{ steps.doppler-ci.outputs.DOPPLER_PROJECT }}",
          ].join("")
        );
        expect(receipts).toContain(
          'test "$DOPPLER_PROJECT" = "taxkit" && test "$DOPPLER_CONFIG" = "ci"'
        );
        expect(receipts).not.toContain("inject-env-vars");
        expect(receipts.lastIndexOf(cacheSaveAction)).toBeLessThan(
          receipts.indexOf(dopplerAction)
        );
        expect(receipts.indexOf(dopplerAction)).toBeLessThan(
          receipts.indexOf("Validate completed workflow input and run identity")
        );
        expect(receipts).toContain("Prepare the allowlisted receipt upload");
        const uploadPreparation = EffectArray.get(
          receipts.split(
            "      - name: Prepare the allowlisted receipt upload\n"
          ),
          1
        ).pipe(
          Option.flatMap((step) =>
            EffectArray.get(
              step.split("      - name: Upload reconciled workflow receipt\n"),
              0
            )
          ),
          Option.getOrUndefined
        );
        expect(uploadPreparation).toBeDefined();
        expect(uploadPreparation).toContain("workflow-run.json");
        expect(uploadPreparation).toContain("workflow-run-failure.json");
        expect(uploadPreparation).not.toContain("workflow-run-api.raw.json");
        expect(uploadPreparation).not.toContain("docs-deployment/source");
        expect(receipts).toContain(
          ["path: $", "{{ runner.temp }}/docs-deployment-upload"].join("")
        );
        expect(receipts).not.toContain(
          ["path: $", "{{ runner.temp }}/docs-deployment\n"].join("")
        );
        expect(receipts).toContain(
          'test "$(find "$upload" -type f | wc -l | tr -d \' \')" = "1"'
        );
        expect(receipts).not.toContain("secrets.CLOUDFLARE");
        expect(receipts.match(/secrets\./gu)).toHaveLength(1);
        expect(
          receipts.match(/steps\.doppler-ci\.outputs\.TURBO_TOKEN/gu)
        ).toHaveLength(1);
      }).pipe(Effect.provide(BunServices.layer))
  );
});
