import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Array, Effect, FileSystem, Option, Record, Schema } from "effect";
import type { OxlintConfig } from "oxlint";

import oxlintConfig from "../../oxlint.config.js";
import { lintFiles, writeLintFixture } from "./cli-fixture.js";

const { join } = nodePath;
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

const antiSlopRules = [
  "no-chained-type-assertions",
  "no-conditional-empty-object-spread",
  "no-known-value-widening",
  "no-module-mocking",
  "no-object-parameters",
  "no-reflect-apply",
  "no-reflect-get",
  "no-runtime-typeof",
  "no-shape-in-symbol-names",
  "no-unknown-parameters",
  "no-unknown-returns",
  "no-unknown-type-aliases",
  "no-unsafe-dictionary-type",
  "no-widen-then-assert",
  "require-safety-comment-for-type-assertion",
] as const;

const fixtureCases = [
  {
    accepted: [
      "packages/api/rpc/src/group.ts",
      "packages/api/rpc/src/handlers.ts",
      "packages/api/rpc/src/live.layer.ts",
      "packages/api/rpc/src/schemas.ts",
      "packages/api/rpc/src/errors.ts",
      "packages/api/rpc/src/server.ts",
      "packages/api/rpc/src/server-serialization.boundary.ts",
      "packages/api/rpc/src/service.ts",
      "packages/api/rpc/src/test.layer.ts",
      "packages/api/rpc/src/__testing__/fixtures.ts",
      "packages/api/rpc/test/handlers.test.ts",
      "packages/api/rpc/test/deadline.test.ts",
      "packages/api/rpc/vitest.config.ts",
    ],
    generated: "packages/api/rpc/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["tools/oxlint/fixtures/strict-commonjs-accepted.cjs"],
    generated: ".generated-owned-source-rejected.cjs",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-commonjs-rejected.cjs.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "error-constructor-new",
    ],
  },
  ...Array.map(
    [
      "bun-accepted",
      "bun-global-non-host-accepted",
      "bun-unrelated-accepted",
      "effect-accepted",
      "effect-unrelated-accepted",
    ] as const,
    (name) => ({
      accepted: ["tools/oxlint/fixtures/strict-global-accepted.js"],
      generated: `tools/oxlint/fixtures/.generated-${name}-neighbour.ts`,
      namespace: "strict-effect",
      rejected: "tools/oxlint/fixtures/strict-global-rejected.js.txt",
      rules: [
        "no-native-at",
        "tagged-error-name",
        "error-constructor-new",
        "no-unsafe-option-unwrap",
      ],
    })
  ),
  ...Array.map(["ts", "tsx", "js", "jsx", "mjs"] as const, (extension) => ({
    accepted: ["tools/oxlint/fixtures/strict-global-accepted.js"],
    generated: `.generated-owned-source-rejected.${extension}`,
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-global-rejected.js.txt",
    rules: [
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-unsafe-option-unwrap",
    ],
  })),
  {
    accepted: [
      "apps/docs/scripts/cloudflare-built-proof.boundary.ts",
      "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
      "apps/docs/scripts/cloudflare-built-proof.live.layer.test.ts",
      "apps/docs/scripts/cloudflare-built-proof.boundary.test.ts",
      "apps/docs/scripts/cloudflare-built-browser.live.ts",
      "apps/docs/scripts/cloudflare-built-browser.live.test.ts",
      "apps/docs/scripts/test-cloudflare-built.tsx",
    ],
    generated: "apps/docs/scripts/.generated-built-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },

  {
    accepted: [
      "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
      "apps/docs/scripts/cloudflare-hosted-proof.live.layer.ts",
      "apps/docs/scripts/cloudflare-hosted-proof.live.layer.test.ts",
      "apps/docs/scripts/cloudflare-hosted-proof.boundary.test.ts",
      "apps/docs/scripts/test-cloudflare-hosted.tsx",
      "apps/docs/scripts/test-cloudflare-hosted.propagation.test.ts",
    ],
    generated: "apps/docs/scripts/.generated-hosted-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "apps/web/src/lib/config.ts",
      "apps/web/src/lib/config.server.ts",
      "apps/web/src/lib/config.boundary.test.ts",
      "apps/web/src/lib/route-context.ts",
      "apps/web/src/lib/runtime.server.ts",
      "apps/web/src/lib/calculator.atoms.ts",
      "apps/web/src/lib/loaders.ts",
      "apps/web/src/lib/calculator.boundary.browser.test.tsx",
      "apps/web/scripts/native-pair-build.runtime.ts",
      "apps/web/test/native-pair.boundary.test.ts",
      "apps/web/test/native-settings-failure.boundary.test.ts",
      "apps/web/test/native-rpc-failures.boundary.test.ts",
      "apps/web/test/native-cancellation.boundary.test.ts",
      "apps/web/test/native-local-development.boundary.test.ts",
      "apps/web/vitest.native.config.ts",
      "apps/web/src/lib/form.boundary.ts",
      "apps/web/src/lib/loaders.server.ts",
      "apps/web/src/server.ts",
      "apps/web/src/routes/index.tsx",
      "apps/web/src/lib/atom-lifecycle.browser.test.tsx",
      "apps/web/src/lib/health-loader.boundary.browser.test.tsx",
      "apps/web/vite.config.ts",
      "apps/web/vitest.config.ts",
      "apps/web/vitest.browser.config.ts",
    ],
    generated: "apps/web/src/.generated-app-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "packages/infrastructure/src/stage.ts",
      "packages/infrastructure/src/stack.ts",
      "packages/infrastructure/src/cloudflare/website.ts",
      "packages/infrastructure/src/cloudflare/website.test.ts",
    ],
    generated: "packages/infrastructure/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "apps/docs/src/server.ts",
      "apps/docs/src/lib/runtime.server.ts",
      "apps/docs/src/lib/docs/loaders.ts",
      "apps/docs/src/lib/docs/loaders.server.ts",
      "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
      "apps/docs/src/lib/mdx/components.tsx",
      "apps/docs/src/routes/$.tsx",
      "apps/docs/vite.config.ts",
      "apps/docs/vitest.browser.config.ts",
    ],
    generated: "apps/docs/src/.generated-app-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "apps/docs/src/lib/runtime-factory.server.ts",
      "apps/docs/src/lib/runtime-factory.server.test.ts",
      "apps/docs/src/lib/docs/route-boundary.test.ts",
      "apps/docs/vitest.server.config.ts",
    ],
    generated:
      "apps/docs/src/lib/docs/.generated-native-tests-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "apps/docs/scripts/check-import-boundaries.runtime.ts",
      "apps/docs/scripts/check-import-boundaries.runtime.test.ts",
      "apps/docs/vitest.scripts.config.ts",
    ],
    generated: "apps/docs/scripts/.generated-imports-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "apps/api/src/config.ts",
      "apps/api/src/schemas.ts",
      "apps/api/src/server.ts",
      "apps/api/src/index.ts",
      "apps/api/scripts/routes.ts",
      "apps/api/scripts/schemas.ts",
      "apps/api/scripts/smoke-public-routes.runtime.ts",
      "apps/api/scripts/smoke-boundaries.test.ts",
      "apps/api/test/config.test.ts",
      "apps/api/vitest.config.ts",
    ],
    generated: "apps/api/scripts/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
      "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
      "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
      "packages/sdk/typescript/scripts/schemas.ts",
      "packages/sdk/typescript/scripts/script-boundaries.test.ts",
    ],
    generated: "packages/sdk/typescript/scripts/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },

  {
    accepted: [
      "packages/sdk/typescript/src/au.test.ts",
      "packages/sdk/typescript/src/au.ts",
      "packages/sdk/typescript/src/au-effect.ts",
      "packages/sdk/typescript/src/client-lifetime.test.ts",
      "packages/sdk/typescript/src/client.runtime.ts",
      "packages/sdk/typescript/src/effect.test.ts",
      "packages/sdk/typescript/src/effect.ts",
      "packages/sdk/typescript/src/errors.ts",
      "packages/sdk/typescript/src/index.test.ts",
      "packages/sdk/typescript/src/index.ts",
      "packages/sdk/typescript/src/internal/au-descriptors.ts",
      "packages/sdk/typescript/src/live.layer.ts",
      "packages/sdk/typescript/src/schemas/index.ts",
      "packages/sdk/typescript/src/testing/index.ts",
      "packages/sdk/typescript/src/types.ts",
      "packages/sdk/typescript/type-tests/plain-client.test.ts",
      "packages/sdk/typescript/type-tests/effect-client.test.ts",
      "packages/sdk/typescript/vitest.config.ts",
      "packages/sdk/typescript/vitest.browser.config.ts",
    ],
    generated: "packages/sdk/typescript/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },

  {
    accepted: [
      "packages/scripts/src/index.ts",
      "packages/scripts/src/release-readiness/cli.test.ts",
      "packages/scripts/src/release-readiness/cli.ts",
      "packages/scripts/src/release-readiness/errors.ts",
      "packages/scripts/src/release-readiness/evidence.boundary.test.ts",
      "packages/scripts/src/release-readiness/evidence.boundary.ts",
      "packages/scripts/src/release-readiness/index.ts",
      "packages/scripts/src/release-readiness/live.layer.test.ts",
      "packages/scripts/src/release-readiness/live.layer.ts",
      "packages/scripts/src/release-readiness/output-redaction.ts",
      "packages/scripts/src/release-readiness/present.runtime.ts",
      "packages/scripts/src/release-readiness/program.test.ts",
      "packages/scripts/src/release-readiness/program.ts",
      "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
      "packages/scripts/src/release-readiness/schemas.ts",
      "packages/scripts/src/release-readiness/service.ts",
      "packages/scripts/src/release-readiness/test.layer.ts",
      "packages/scripts/vitest.config.ts",
    ],
    generated:
      "packages/scripts/src/release-readiness/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },

  {
    accepted: [
      "tools/oxlint/binding-tracker.ts",
      "tools/oxlint/binding-tracker.test.ts",
      "tools/oxlint/host.types.ts",
      "tools/oxlint/bun-rules.ts",
      "tools/oxlint/effect-rules.ts",
      "tools/oxlint/mdx-rules.ts",
      "tools/oxlint/package-rules.ts",
      "tools/oxlint/taxkit-rules.ts",
    ],
    generated: "tools/oxlint/.generated-strict-bindings.js",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-bindings-rejected.js.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["apps/web/src/lib/runtime.server.ts"],
    generated: "apps/web/src/lib/.generated-strict-runtime.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-native-at",
      "runtime-file-convention",
      "tagged-error-name",
      "error-constructor-new",
      "no-unsafe-option-unwrap",
    ],
  },
  {
    accepted: ["tools/oxlint/fixtures/strict-global-accepted.js"],
    generated: "tools/oxlint/fixtures/.generated-strict-global-rejected.js",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-global-rejected.js.txt",
    rules: [
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-unsafe-option-unwrap",
    ],
  },
  {
    accepted: ["oxlint.config.ts"],
    generated: ".generated-strict.config.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-unsafe-option-unwrap",
    ],
  },
  {
    accepted: ["tools/oxlint/cli-fixture.ts"],
    generated: "tools/oxlint/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/docs-content/src/validate.runtime.ts"],
    generated: "packages/docs-content/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/docs-fumadocs/src/live.layer.ts"],
    generated: "packages/docs-fumadocs/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/quality-workflow/check.runtime.ts",
      "tools/quality-workflow/policy.test.ts",
      "tools/quality-workflow/release-boundary.test.ts",
    ],
    generated: "tools/quality-workflow/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/documentation/check.runtime.ts",
      "tools/documentation/runbook-check.runtime.ts",
      "tools/documentation/policy.ts",
      "tools/documentation/runbook-policy.ts",
      "tools/documentation/policy.test.ts",
      "tools/documentation/runbook-policy.test.ts",
      "tools/documentation/check.runtime.test.ts",
      "tools/documentation/runbook-check.runtime.test.ts",
    ],
    generated: "tools/documentation/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/evals/hgi-206/check.runtime.ts",
      "tools/evals/hgi-206/check.runtime.test.ts",
      "tools/evals/hgi-206/input.boundary.ts",
      "tools/evals/hgi-206/input.boundary.test.ts",
      "tools/evals/hgi-206/schemas.ts",
      "tools/evals/hgi-206/service.ts",
      "tools/evals/hgi-206/service.test.ts",
      "tools/evals/harness-foundation/check.runtime.ts",
      "tools/evals/harness-foundation/input.boundary.ts",
      "tools/evals/harness-foundation/schemas.ts",
    ],
    generated: "tools/evals/hgi-206/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/docs-deployment/input.boundary.ts",
      "tools/docs-deployment/input.boundary.test.ts",
      "tools/docs-deployment/workflow-artifact.ts",
      "tools/docs-deployment/workflow-artifact.schemas.ts",
      "tools/docs-deployment/workflow-artifact.runtime.ts",
      "tools/docs-deployment/workflow-artifact.test.ts",
      "tools/docs-deployment/strict-boundaries.policy.ts",
      "tools/docs-deployment/strict-boundaries.contract.test.ts",
      "tools/docs-deployment/alchemy-memo.test.ts",
    ],
    generated: "tools/docs-deployment/.generated-artifact-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/docs-deployment/doppler-custody.boundary.ts",
      "tools/docs-deployment/doppler-custody.runtime.ts",
      "tools/docs-deployment/doppler-custody.test.ts",
      "tools/docs-deployment/inventory-credentials.boundary.ts",
      "tools/docs-deployment/inventory-credentials.boundary.test.ts",
      "tools/docs-deployment/inventory.schemas.ts",
      "tools/docs-deployment/local-doppler.ts",
      "tools/docs-deployment/local-doppler.runtime.ts",
      "tools/docs-deployment/local-doppler.schemas.ts",
      "tools/docs-deployment/local-doppler.test.ts",
      "tools/docs-deployment/local-doppler-environment.boundary.ts",
      "tools/docs-deployment/local-doppler-environment.boundary.test.ts",
      "tools/docs-deployment/workflow-check.boundary.ts",
      "tools/docs-deployment/workflow-check.boundary.test.ts",
      "tools/docs-deployment/workflow-check.schemas.ts",
      "tools/docs-deployment/workflow-input-check.runtime.ts",
      "tools/docs-deployment/fixtures/fake-doppler.runtime.ts",
      "tools/docs-deployment/fixtures/fake-doppler.schemas.ts",
    ],
    generated: "tools/docs-deployment/.generated-credential-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/docs-deployment/workflow.contract.test.ts",
      "tools/docs-deployment/workflow-plan-projection.ts",
      "tools/docs-deployment/workflow-plan-projection.runtime.ts",
      "tools/docs-deployment/workflow-plan-projection.runtime.test.ts",
      "tools/docs-deployment/workflow-plan-projection.test.ts",
      "tools/docs-deployment/workflow-plan-check.runtime.ts",
      "tools/docs-deployment/workflow-evidence.ts",
      "tools/docs-deployment/workflow-evidence.runtime.ts",
      "tools/docs-deployment/workflow-evidence.schemas.ts",
      "tools/docs-deployment/workflow-evidence.test.ts",
    ],
    generated: "tools/docs-deployment/.generated-workflow-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/docs-deployment/automation.check.runtime.ts",
      "tools/docs-deployment/automation.check.runtime.test.ts",
      "tools/docs-deployment/automation.policy.ts",
      "tools/docs-deployment/automation.policy.test.ts",
      "tools/docs-deployment/automation.schemas.ts",
      "tools/docs-deployment/workflow-receipts.schemas.ts",
    ],
    generated: "tools/docs-deployment/.generated-automation-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/docs-deployment/policy.ts",
      "tools/docs-deployment/policy.test.ts",
      "tools/docs-deployment/schemas.ts",
      "tools/docs-deployment/check.runtime.ts",
      "tools/docs-deployment/retained-record.egress.ts",
      "tools/docs-deployment/retained-record.egress.test.ts",
    ],
    generated:
      "tools/docs-deployment/.generated-retained-proof-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/docs-deployment/inventory.service.ts",
      "tools/docs-deployment/inventory.service.test.ts",
      "tools/docs-deployment/inventory.live.layer.ts",
      "tools/docs-deployment/inventory.live.layer.test.ts",
      "tools/docs-deployment/inventory.test.layer.ts",
      "tools/docs-deployment/inventory.report.egress.ts",
      "tools/docs-deployment/inventory.runtime.ts",
      "tools/docs-deployment/inventory.runtime.test.ts",
      "tools/docs-deployment/workflow-proof-check.runtime.ts",
      "tools/docs-deployment/workflow-run-check.runtime.ts",
      "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
    ],
    generated: "tools/docs-deployment/.generated-inventory-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["tools/skills/skill-policies.test.ts"],
    generated: "tools/skills/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/testing/src/index.ts"],
    generated: "packages/testing/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/api/http/src/client/in-process.layer.ts"],
    generated: "packages/api/http/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["tools/repository-paths/check.runtime.ts"],
    generated: "tools/repository-paths/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/governance/policy.test.ts",
      "tools/governance/check.runtime.ts",
    ],
    generated: "tools/governance/.generated-strict-rejected.test.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/core/src/graph/rule-graph.ts"],
    generated: "packages/core/src/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: ["packages/rules/au/pay/test/rule-graph.test.ts"],
    generated: "packages/rules/au/pay/test/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "packages/calculators/__tests__/public-calculator-service.test.ts",
    ],
    generated: "packages/calculators/__tests__/.generated-strict-rejected.ts",
    namespace: "strict-effect",
    rejected: "tools/oxlint/fixtures/strict-collections-rejected.ts.txt",
    rules: [
      "no-imperative-collections",
      "no-unchecked-index",
      "no-native-at",
      "tagged-error-name",
      "error-constructor-new",
      "no-promise-workflow",
      "no-unsafe-option-unwrap",
      "no-unchecked-json",
      "no-runtime-outside-boundary",
      "no-native-work",
    ],
  },
  {
    accepted: [
      "tools/oxlint/fixtures/effect-accepted.ts",
      "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
    ],
    generated: "tools/oxlint/fixtures/.generated-effect-rejected.ts",
    namespace: "effect",
    rejected: "tools/oxlint/fixtures/effect-rejected.ts.txt",
    rules: [
      "no-bare-effect-try-promise",
      "no-console-outside-runtime",
      "no-effect-test-global-mix",
      "no-host-imports-in-contracts",
      "no-layer-exports-in-service-files",
      "no-manual-tag",
      "no-module-level-mutable-test-state",
      "no-process-outside-boundaries",
      "no-runtime-execution-outside-boundaries",
      "no-schema-encoder-outside-egress",
      "no-switch",
      "no-throwing-schema-sync-codec",
      "no-unknown-service-contract",
      "no-unknown-tagged-error-cause",
    ],
  },
  {
    accepted: [
      "tools/oxlint/fixtures/bun-accepted.ts",
      "tools/oxlint/fixtures/bun-global-non-host-accepted.ts",
      "tools/oxlint/fixtures/bun-unrelated-accepted.ts",
    ],
    generated: "tools/oxlint/fixtures/.generated-bun-rejected.ts",
    namespace: "bun",
    rejected: "tools/oxlint/fixtures/bun-rejected.ts.txt",
    rules: ["no-host-api-outside-adapters", "no-runtime-outside-entrypoints"],
  },
  {
    accepted: ["tools/oxlint/fixtures/mdx-accepted.tsx"],
    generated: "tools/oxlint/fixtures/.generated-mdx-rejected.tsx",
    namespace: "mdx",
    rejected: "tools/oxlint/fixtures/mdx-rejected.tsx.txt",
    rules: ["no-route-local-component-registry"],
  },
  {
    accepted: ["tools/oxlint/fixtures/anti-slop-effect-accepted.test.ts"],
    generated: "tools/oxlint/fixtures/.generated-anti-slop-effect-rejected.ts",
    namespace: "anti-slop-effect",
    rejected: "tools/oxlint/fixtures/anti-slop-effect-rejected.ts.txt",
    rules: ["no-service-constructor-imports"],
  },
  {
    accepted: ["tools/oxlint/fixtures/package-accepted.ts"],
    generated: "apps/web/src/.generated-package-rejected.ts",
    namespace: "package",
    rejected: "tools/oxlint/fixtures/package-rejected.ts.txt",
    rules: ["no-cross-package-source-imports"],
  },
] as const;

const runOxlint = (path: string) =>
  Effect.gen(function* () {
    const result = yield* lintFiles([path], [], "json");
    const report = yield* Schema.decodeEffect(
      Schema.fromJsonString(
        Schema.Struct({
          diagnostics: Schema.Array(Schema.Struct({ code: Schema.String })),
          number_of_files: Schema.Int,
        })
      )
    )(result.stdout);
    return {
      codes: Array.map(report.diagnostics, (diagnostic) => diagnostic.code),
      exitCode: result.exitCode,
      files: report.number_of_files,
    };
  });

test("keeps full source coverage and its five unexecuted fixture exclusions exact", () => {
  const strict = Array.filter(oxlintConfig.overrides ?? [], (entry) =>
    Array.contains(entry.files ?? [], "packages/core/**")
  );
  expect(strict).toHaveLength(1);
  const scope = Array.head(strict).pipe(
    Option.getOrElse(() => ({ excludeFiles: [], files: [] }))
  );
  expect(scope.files, "Owned source extension coverage").toContain(
    "**/*.{ts,tsx,js,jsx,mjs,cjs}"
  );
  const configuration: OxlintConfig = oxlintConfig;
  const promiseScope = Array.filter(configuration.overrides ?? [], (entry) =>
    Record.get<string>("effect/no-bare-effect-try-promise")(
      entry.rules ?? {}
    ).pipe(Option.exists((severity) => severity === "error"))
  );
  expect(promiseScope).toHaveLength(1);
  expect(
    Array.head(promiseScope).pipe(
      Option.map((entry) => entry.files),
      Option.getOrUndefined
    ),
    "Owned Promise mapping coverage"
  ).toEqual(["**/*.{cjs,mjs,jsx,js,tsx,ts}"]);
  expect(scope.excludeFiles, "Owned-source fixture exclusions").toEqual([
    "tools/oxlint/fixtures/bun-accepted.ts",
    "tools/oxlint/fixtures/bun-global-non-host-accepted.ts",
    "tools/oxlint/fixtures/bun-unrelated-accepted.ts",
    "tools/oxlint/fixtures/effect-accepted.ts",
    "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
  ]);
});

describe("portable Oxlint plugins", () => {
  test.effect.each([
    "apps/web/src/.generated-promise-mapping.ts",
    "apps/docs/src/.generated-promise-mapping.tsx",
    "packages/infrastructure/src/.generated-promise-mapping.ts",
    ".generated-promise-mapping.js",
    ".generated-promise-mapping.jsx",
    ".generated-promise-mapping.mjs",
  ])("enforces inline Promise error mapping at $name", (path) =>
    Effect.gen(function* () {
      yield* writeLintFixture(
        join(repositoryRoot, path),
        `import { Effect } from "effect";
export const rejected = Effect.tryPromise(() => Promise.resolve("bad"));
export const accepted = Effect.tryPromise({ try: () => Promise.resolve("good"), catch: () => "fixed" });`
      );
      const result = yield* runOxlint(path);
      expect(result.files).toBe(1);
      expect(result.exitCode).toBe(1);
      expect(
        Array.filter(
          result.codes,
          (code) => code === "effect(no-bare-effect-try-promise)"
        )
      ).toHaveLength(1);
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect.each([
    {
      count: 1,
      name: "keeps an imported runner separate from a same-named local runner",
      rule: "effect(no-runtime-execution-outside-boundaries)",
      source: `import { Effect } from "effect";
export const imported = Effect.runSync(Effect.void);
export const local = (Effect) => Effect.runSync("local");`,
    },
    {
      count: 1,
      name: "follows a runner through import and destructuring aliases",
      rule: "effect(no-runtime-execution-outside-boundaries)",
      source: `import { Effect as Fx } from "effect";
const { runSync: execute } = Fx;
export const value = execute(Fx.void);`,
    },
    {
      count: 0,
      name: "clears an assigned runner when its source becomes unrelated",
      rule: "effect(no-runtime-execution-outside-boundaries)",
      source: `import { Effect } from "effect";
let execute = Effect.runSync;
execute = (value) => value;
export const value = execute("local");`,
    },
    {
      count: 2,
      name: "resolves a Bun host alias without confusing a local parameter",
      rule: "bun(no-host-api-outside-adapters)",
      source: `const { file: open } = Bun;
export const host = open("package.json");
export const local = (Bun) => Bun.file("local");`,
    },
    {
      count: 0,
      name: "accepts direct inline try and catch callbacks after aliasing",
      rule: "effect(no-bare-effect-try-promise)",
      source: `import { Effect as Fx } from "effect";
const { tryPromise: attempt } = Fx;
export const value = attempt({ try: () => Promise.resolve(1), catch: () => "failed" });`,
    },
    {
      count: 1,
      name: "rejects a missing catch callback after aliasing",
      rule: "effect(no-bare-effect-try-promise)",
      source: `import { Effect as Fx } from "effect";
const { tryPromise: attempt } = Fx;
export const value = attempt({ try: () => Promise.resolve(1) });`,
    },
  ])("$name", ({ source, rule, count }) =>
    Effect.gen(function* () {
      const path = "tools/oxlint/.generated-binding-policy.ts";
      yield* writeLintFixture(join(repositoryRoot, path), source);
      const result = yield* runOxlint(path);
      expect(result.files).toBe(1);
      expect(Array.filter(result.codes, (code) => code === rule)).toHaveLength(
        count
      );
      expect(Array.some(result.codes, (code) => code.includes("plugin"))).toBe(
        false
      );
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect("enables every anti-slop rule at error severity", () =>
    Effect.gen(function* () {
      yield* Effect.forEach(antiSlopRules, (rule) =>
        Effect.sync(() => {
          expect(
            Record.get(`anti-slop/${rule}`)(oxlintConfig.rules ?? {}).pipe(
              Option.getOrUndefined
            )
          ).toBe("error");
        })
      );
      expect(
        Record.get("anti-slop-effect/no-service-constructor-imports")(
          oxlintConfig.rules ?? {}
        ).pipe(Option.getOrUndefined)
      ).toBe("error");
    })
  );

  // Each path starts a real process. Give each file its own ordinary test
  // deadline rather than sharing one deadline across a growing file group.
  test.effect.each(
    Array.flatMap(fixtureCases, (fixture) =>
      Array.map(fixture.accepted, (path) => ({
        namespace: fixture.namespace,
        path,
      }))
    )
  )("$namespace accepts its boundary fixture ($path)", ({ namespace, path }) =>
    Effect.gen(function* () {
      const result = yield* runOxlint(path);
      expect(result.files).toBe(1);
      expect(result.exitCode).toBe(0);
      expect(
        Array.some(result.codes, (code) => code.startsWith(`${namespace}(`))
      ).toBe(false);
    }).pipe(Effect.provide(BunServices.layer))
  );

  test.effect.each(fixtureCases)(
    "$namespace rejects invalid code through the real binary ($generated)",
    (fixture) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const source = yield* fs.readFileString(
          join(repositoryRoot, fixture.rejected)
        );
        yield* writeLintFixture(
          join(repositoryRoot, fixture.generated),
          source
        );
        const result = yield* runOxlint(fixture.generated);
        expect(result.files).toBe(1);
        expect(result.exitCode).toBe(1);
        yield* Effect.forEach(fixture.rules, (rule) =>
          Effect.sync(() => {
            expect(
              result.codes,
              `Required lint rule: ${fixture.namespace}/${rule}`
            ).toContain(`${fixture.namespace}(${rule})`);
          })
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
});

// Oxlint has no stdin mode; use one exact admitted fixture and a neighbouring canary.
test.effect.each([
  {
    name: "admits the Fetch result type only at its exact host",
    path: "tools/oxlint/.generated-fetch-host.ts",
    rejected: false,
    source: "export type Handler = (request: Request) => Promise<Response>;",
  },
  {
    name: "rejects an adjacent Promise signature",
    path: "tools/oxlint/.generated-ordinary.ts",
    rejected: true,
    source: "export type Handler = (request: Request) => Promise<Response>;",
  },
  {
    name: "rejects async orchestration even at the Fetch host",
    path: "tools/oxlint/.generated-fetch-host.ts",
    rejected: true,
    source: "export const handler = async () => await Promise.resolve(1);",
  },
])("$name", ({ path, source, rejected }) =>
  Effect.gen(function* () {
    yield* writeLintFixture(join(repositoryRoot, path), source);
    const result = yield* lintFiles([path]);
    expect(result.output.includes("strict-effect(no-promise-workflow)")).toBe(
      rejected
    );
    expect(result.exitCode).toBe(rejected ? 1 : 0);
  }).pipe(Effect.provide(BunServices.layer))
);

// Policy changes must review both the filename selector and the canonical admission.
test.effect.each([
  {
    name: "admits an assignment only at the exact synthetic host target",
    path: "tools/oxlint/.generated-collection-host.ts",
    rejected: false,
    source:
      "const host = { value: 0 }; export const onHostEvent = () => { host.value = 1; };",
  },
  {
    name: "rejects that assignment in the neighbouring file",
    path: "tools/oxlint/.generated-collection-neighbour.ts",
    rejected: true,
    source:
      "const host = { value: 0 }; export const onHostEvent = () => { host.value = 1; };",
  },
  {
    name: "rejects an unrelated assignment target at the synthetic host",
    path: "tools/oxlint/.generated-collection-host.ts",
    rejected: true,
    source:
      "const host = { other: 0, value: 0 }; export const onHostEvent = () => { host.other = 1; };",
  },
  {
    name: "admits one method only at the exact synthetic host receiver",
    path: "tools/oxlint/.generated-collection-host.ts",
    rejected: false,
    source:
      "const host: number[] = []; export const onHostEvent = () => { host.push(1); };",
  },
  {
    name: "rejects that method in the neighbouring file",
    path: "tools/oxlint/.generated-collection-neighbour.ts",
    rejected: true,
    source:
      "const host: number[] = []; export const onHostEvent = () => { host.push(1); };",
  },
  {
    name: "rejects an unrelated method at the synthetic host",
    path: "tools/oxlint/.generated-collection-host.ts",
    rejected: true,
    source:
      "const host = [1]; export const onHostEvent = () => host.map((value) => value + 1);",
  },
  {
    name: "rejects a different receiver at the synthetic host",
    path: "tools/oxlint/.generated-collection-host.ts",
    rejected: true,
    source:
      "const other: number[] = []; export const onHostEvent = () => { other.push(1); };",
  },
  {
    name: "rejects loops even at the admitted synthetic host",
    path: "tools/oxlint/.generated-collection-host.ts",
    rejected: true,
    source: "for (const value of [1]) { void value; }",
  },
])("$name", ({ path, rejected, source }) =>
  Effect.gen(function* () {
    yield* writeLintFixture(join(repositoryRoot, path), source);
    const result = yield* runOxlint(path);
    expect(result.files).toBe(1);
    expect(
      Array.contains(result.codes, "strict-effect(no-imperative-collections)"),
      "Strict collection admission canary"
    ).toBe(rejected);
    expect(result.exitCode).toBe(rejected ? 1 : 0);
  }).pipe(Effect.provide(BunServices.layer))
);

test.each([
  "apps/docs/scripts/test-cloudflare-built.tsx",
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "apps/docs/src/lib/docs/loaders.server.ts",
  "apps/docs/src/server.ts",
  "apps/docs/vite.config.ts",
  "apps/web/vite.config.ts",
  "apps/web/src/lib/runtime.server.ts",
  "apps/web/src/lib/loaders.server.ts",
  "apps/web/src/lib/loaders.ts",
  "apps/web/src/lib/health-loader.boundary.browser.test.tsx",
  "apps/web/scripts/native-pair-build.runtime.ts",
  "apps/web/src/server.ts",
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/runtime-factory.server.ts",
  "apps/docs/scripts/check-import-boundaries.runtime.ts",
  "apps/api/src/index.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "packages/sdk/typescript/src/client.runtime.ts",
  "packages/scripts/src/release-readiness/present.runtime.ts",
  "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  "tools/repository-paths/check.runtime.ts",
  "tools/governance/check.runtime.ts",
  "tools/quality-workflow/check.runtime.ts",
  "packages/docs-content/src/validate.runtime.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/evals/hgi-206/check.runtime.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/docs-deployment/workflow-artifact.runtime.ts",
  "tools/docs-deployment/doppler-custody.runtime.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/workflow-input-check.runtime.ts",
  "tools/docs-deployment/fixtures/fake-doppler.runtime.ts",
  "tools/docs-deployment/workflow-plan-projection.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "tools/docs-deployment/automation.check.runtime.ts",
  "tools/docs-deployment/check.runtime.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/workflow-proof-check.runtime.ts",
  "tools/docs-deployment/workflow-run-check.runtime.ts",
  "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
])("keeps the execution runtime admission exact: %s", (path) => {
  expect(
    Array.filter(
      oxlintConfig.overrides ?? [],
      (entry: NonNullable<OxlintConfig["overrides"]>[number]) =>
        Array.contains(entry.files ?? [], path) &&
        Record.get<string>("strict-effect/no-runtime-outside-boundary")(
          entry.rules ?? {}
        ).pipe(Option.exists(Array.isArray))
    )
  ).toEqual([
    {
      files: [path],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: [path] },
        ],
      },
    },
  ]);
});

test.each([
  "packages/sdk/typescript/src/client.runtime.ts",
  "apps/docs/src/server.ts",
  "apps/web/src/server.ts",
])("keeps the host Promise result admission exact: %s", (path) => {
  expect(
    Array.filter(
      oxlintConfig.overrides ?? [],
      (entry: NonNullable<OxlintConfig["overrides"]>[number]) =>
        Array.contains(entry.files ?? [], path) &&
        Record.has<string>("strict-effect/no-promise-workflow")(
          entry.rules ?? {}
        )
    )
  ).toEqual([
    {
      files: [path],
      rules: {
        "strict-effect/no-promise-workflow": [
          "error",
          { allowedFiles: [path] },
        ],
      },
    },
  ]);
});

describe("exact native RPC lint boundaries", () => {
  test.effect("rejects decoding beside the native app stage ingress", () =>
    Effect.gen(function* () {
      const path =
        "packages/infrastructure/src/.generated-app-decoder-neighbour.ts";
      yield* writeLintFixture(
        join(repositoryRoot, path),
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);'
      );
      const result = yield* runOxlint(path);
      expect(result.files).toBe(1);
      expect(result.exitCode).not.toBe(0);
      expect(result.codes).toContain("taxkit(no-decoding-outside-boundaries)");
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
  test.effect("rejects decoding in a neighbouring RPC source file", () =>
    Effect.gen(function* () {
      const path = "packages/api/rpc/src/.generated-decoder-neighbour.ts";
      yield* writeLintFixture(
        join(repositoryRoot, path),
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);'
      );
      const result = yield* runOxlint(path);
      expect(result.files).toBe(1);
      expect(result.exitCode).not.toBe(0);
      expect(result.codes).toContain("taxkit(no-decoding-outside-boundaries)");
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
  test.effect.each([
    {
      path: "apps/web/test/native-local-development.boundary.test.ts",
      rejected: false,
      rule: "taxkit(no-decoding-outside-boundaries)",
      source:
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "apps/web/test/native-local-development.boundary.test.ts",
      rejected: true,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "apps/web/test/native-local-development.boundary.test.ts",
      rejected: true,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
    {
      path: "apps/web/test/native-cancellation.boundary.test.ts",
      rejected: false,
      rule: "taxkit(no-decoding-outside-boundaries)",
      source:
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "apps/web/test/native-cancellation.boundary.test.ts",
      rejected: false,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "apps/web/test/native-cancellation.boundary.test.ts",
      rejected: true,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
    {
      path: "apps/web/test/native-rpc-failures.boundary.test.ts",
      rejected: false,
      rule: "taxkit(no-decoding-outside-boundaries)",
      source:
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "apps/web/test/native-rpc-failures.boundary.test.ts",
      rejected: false,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "apps/web/test/native-rpc-failures.boundary.test.ts",
      rejected: true,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
    {
      path: "apps/web/test/native-settings-failure.boundary.test.ts",
      rejected: false,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "apps/web/test/native-settings-failure.boundary.test.ts",
      rejected: true,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
    {
      path: "apps/web/src/lib/config.server.ts",
      rejected: false,
      rule: "taxkit(no-decoding-outside-boundaries)",
      source:
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "apps/web/src/lib/config.server.ts",
      rejected: true,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
    {
      path: "apps/web/src/lib/calculator.atoms.ts",
      rejected: true,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
    {
      path: "apps/web/src/lib/calculator.atoms.ts",
      rejected: true,
      rule: "taxkit(no-decoding-outside-boundaries)",
      source:
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "apps/web/src/lib/loaders.ts",
      rejected: false,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
    {
      path: "apps/web/src/lib/loaders.ts",
      rejected: true,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "apps/web/src/server.ts",
      rejected: false,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "apps/web/src/server.ts",
      rejected: true,
      rule: "strict-effect(no-imperative-collections)",
      source:
        "export const run = () => { const values = [1]; values.push(2); return values; };",
    },
    {
      path: "packages/api/rpc/src/server-serialization.boundary.ts",
      rejected: false,
      rule: "taxkit(no-decoding-outside-boundaries)",
      source:
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "packages/api/rpc/src/server-serialization.boundary.ts",
      rejected: true,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "packages/api/rpc/src/server-serialization.boundary.ts",
      rejected: true,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
    {
      path: "packages/api/rpc/test/handlers.test.ts",
      rejected: false,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String); export const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "packages/api/rpc/test/deadline.test.ts",
      rejected: false,
      rule: "taxkit(no-decoding-outside-boundaries)",
      source:
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "packages/api/rpc/test/deadline.test.ts",
      rejected: true,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "apps/api/test/worker.boundary.test.ts",
      rejected: false,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "apps/api/test/worker.boundary.test.ts",
      rejected: true,
      rule: "taxkit(no-decoding-outside-boundaries)",
      source:
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "apps/api/test/worker.boundary.test.ts",
      rejected: true,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
    {
      path: "packages/infrastructure/src/apps-secrets.boundary.ts",
      rejected: false,
      rule: "taxkit(no-decoding-outside-boundaries)",
      source:
        'import { Schema } from "effect";\n\nexport const decode = Schema.decodeUnknownEffect(Schema.String);',
    },
    {
      path: "packages/infrastructure/src/apps-secrets.boundary.ts",
      rejected: true,
      rule: "effect(no-schema-encoder-outside-egress)",
      source:
        'import { Schema } from "effect";\n\nexport const encode = Schema.encodeEffect(Schema.String);',
    },
    {
      path: "packages/infrastructure/src/apps-secrets.boundary.ts",
      rejected: true,
      rule: "strict-effect(no-runtime-outside-boundary)",
      source:
        'import { Effect } from "effect";\n\nexport const run = Effect.runPromise(Effect.void);',
    },
  ])("keeps $rule exact at $path", ({ path, source, rejected, rule }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const target = join(repositoryRoot, path);
      // The test scope restores the real owner even if the actual CLI assertion
      // fails; removing an existing source file would corrupt the checkout.
      yield* Effect.acquireRelease(fs.readFileString(target), (original) =>
        fs.writeFileString(target, original).pipe(Effect.orDie)
      );
      yield* fs.writeFileString(target, source);
      const result = yield* runOxlint(path);
      expect(result.files).toBe(1);
      if (rejected) {
        expect(result.exitCode).not.toBe(0);
        expect(result.codes).toContain(rule);
      } else {
        expect(result.exitCode, result.codes.join(", ")).toBe(0);
        expect(result.codes).not.toContain(rule);
      }
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
});
