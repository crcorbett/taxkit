import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import remix from "ultracite/oxlint/remix";

const taxkitReact = {
  ...react,
  rules: {
    ...react.rules,
    // Effect Match and Result callbacks return JSX inline but do not define
    // stateful React components. Keep the rule for actual nested components.
    "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
  },
};

const decodingBoundaryFiles = [
  // Application configuration, executable smoke checks and checked examples.
  "apps/api/src/config.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "packages/docs-content/examples/browser-http.ts",
  "packages/docs-content/examples/node-server.ts",
  "apps/docs/src/lib/docs/loaders.ts",
  "apps/docs/src/lib/docs/loaders.server.ts",
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/docs/route-boundary.ts",
  "apps/docs/src/lib/docs/route-boundary.test.js",
  "apps/docs/scripts/test-cloudflare-built.tsx",
  "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
  "packages/infrastructure/src/cloudflare/website.test.ts",
  "packages/infrastructure/src/cloudflare/website.ts",
  "apps/docs/src/lib/build/docs-build-target.ts",
  "packages/docs-content/src/navigation.ts",

  // Docs content and rendering-library representation boundaries.
  "packages/docs-content/src/live.layer.ts",
  "packages/docs-content/src/validation/mdx-component-policy.ts",
  "packages/docs-content/src/validation/policy.runtime.test.ts",
  "packages/docs-content/src/validation/policy.ts",
  "packages/docs-fumadocs/src/code-block-meta.ts",
  "packages/docs-fumadocs/src/live.layer.ts",
  "packages/docs-fumadocs/src/test.layer.ts",
  "packages/docs-fumadocs/src/config.ts",

  // Public API normalisation and focused API contract tests.
  "packages/api/http/src/openapi.ts",
  "packages/api/http/__tests__/openapi-snapshot.test.ts",
  "packages/api/http/__tests__/public-calculation-api.test.ts",

  // Focused lint integration test: CLI output is decoded at the process boundary.
  "tools/oxlint/no-decoding-outside-boundaries.test.ts",
  "tools/oxlint/portable-rules.test.ts",
  "tools/oxlint/no-route-transport-restore-outside-consumers.test.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/check.runtime.test.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/documentation/runbook-check.runtime.test.ts",
  "tools/documentation/runbook-policy.test.ts",
  "tools/docs-deployment/doppler-custody.boundary.ts",
  "tools/docs-deployment/input.boundary.ts",
  "tools/docs-deployment/inventory-credentials.boundary.ts",
  "tools/docs-deployment/workflow-check.boundary.ts",
  "tools/docs-deployment/automation.check.runtime.ts",
  "tools/docs-deployment/automation.policy.test.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/inventory.service.test.ts",
  "tools/docs-deployment/inventory.service.ts",
  "tools/docs-deployment/policy.test.ts",
  "tools/docs-deployment/workflow-evidence.test.ts",
  "tools/docs-deployment/workflow-evidence.ts",
  "tools/docs-deployment/workflow-plan-projection.runtime.ts",
  "tools/docs-deployment/workflow-plan-projection.test.ts",
  "tools/docs-deployment/workflow-plan-projection.ts",
  "tools/docs-deployment/local-doppler.test.ts",
  "tools/repository-paths/check.runtime.ts",
  "tools/repository-paths/policy.test.ts",
  "tools/repository-paths/policy.ts",
  "tools/quality-workflow/check.runtime.ts",
  "tools/quality-workflow/policy.test.ts",
  "tools/quality-workflow/policy.ts",
  "tools/quality-workflow/release-boundary.test.ts",
  "tools/evals/hgi-206/input.boundary.ts",
  "tools/evals/harness-foundation/input.boundary.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/governance/foundation.test.ts",
  "tools/governance/input.boundary.ts",
  "tools/governance/policy.test.ts",

  // Dynamic dispatch and its transitional repeated scenario decodes.
  "packages/calculators/src/catalog.ts",
  "packages/calculators/src/errors.ts",
  "packages/rules/au/income-tax/src/calculator/annual-tax.boundary.ts",
  "packages/rules/au/pay/src/calculator/take-home-pay.boundary.ts",

  // Release-evidence decoders and their adversarial boundary fixtures.
  "packages/scripts/src/release-readiness/evidence.boundary.test.ts",
  "packages/scripts/src/release-readiness/evidence.boundary.ts",
  "packages/scripts/src/release-readiness/cli.test.ts",
  "packages/scripts/src/release-readiness/cli.ts",
  "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  // Cross-process command output restored by the release-readiness live layer.
  "packages/scripts/src/release-readiness/live.layer.ts",

  // SDK type-erasure dispatch and downstream process boundaries.
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/src/effect.ts",
  "packages/sdk/typescript/src/index.ts",
  "packages/sdk/typescript/src/types.ts",
];

const routeTransportBoundaryModules = ["#/lib/docs/route-boundary"];

const routeTransportConsumerFiles = [
  "apps/docs/src/routes/$.tsx",
  "apps/docs/src/routes/index.tsx",
  "tools/oxlint/fixtures/route-transport-allowed.tsx",
  "tools/oxlint/fixtures/.generated-route-transport-consumer.tsx",
];

const effectContractFiles = [
  "apps/**/{config,errors,schema,schemas,service,services}.ts",
  "packages/**/{config,errors,schema,schemas,service,services}.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
  "tools/oxlint/fixtures/.generated-effect-rejected.ts",
];

const effectServiceContractFiles = [
  "apps/**/{service,services}.ts",
  "packages/**/{service,services}.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
  "tools/oxlint/fixtures/.generated-effect-rejected.ts",
];

const effectErrorContractFiles = [
  "apps/**/{errors,schema,schemas}.ts",
  "packages/**/{errors,schema,schemas}.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
  "tools/oxlint/fixtures/.generated-effect-rejected.ts",
];

const portableEffectSourceFiles = [
  "apps/api/**/*.{ts,tsx,js,jsx}",
  "packages/api/http/**/*.{ts,tsx,js,jsx}",
  "packages/calculators/**/*.{ts,tsx,js,jsx}",
  "packages/core/**/*.{ts,tsx,js,jsx}",
  "packages/docs-content/**/*.{ts,tsx,js,jsx}",
  "packages/docs-fumadocs/**/*.{ts,tsx,js,jsx}",
  "packages/rules/au/income-tax/**/*.{ts,tsx,js,jsx}",
  "packages/rules/au/pay/**/*.{ts,tsx,js,jsx}",
  "packages/rules/au/stsl/**/*.{ts,tsx,js,jsx}",
  "packages/scripts/**/*.{ts,tsx,js,jsx}",
  "packages/sdk/typescript/**/*.{ts,tsx,js,jsx}",
  "packages/testing/**/*.{ts,tsx,js,jsx}",
  "tools/effect-language-service/**/*.{ts,tsx,js,jsx}",
  "tools/documentation/**/*.{ts,tsx,js,jsx}",
  "tools/oxlint/**/*.{ts,tsx,js,jsx}",
  "tools/repository-paths/**/*.{ts,tsx,js,jsx}",
  "tools/skills/**/*.{ts,tsx,js,jsx}",
  "tools/governance/**/*.{ts,tsx,js,jsx}",
  "tools/evals/harness-foundation/**/*.{ts,tsx,js,jsx}",
];

const schemaEncoderEgressFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/docs/src/server.ts",
  "apps/docs/src/lib/docs/route-boundary.ts",
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/docs/route-boundary.test.js",
  "apps/docs/src/lib/docs/loaders.server.ts",
  "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
  "packages/scripts/src/release-readiness/evidence.boundary.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/workflow-evidence.ts",
];

const throwingCodecTestFiles = [
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/docs/route-boundary.test.js",
  "packages/docs-content/src/validation/policy.runtime.test.ts",
  "tools/docs-deployment/workflow-plan-projection.test.ts",
];

const runtimeBoundaryFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/api/src/index.ts",
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/docs/route-boundary.test.js",
  "apps/docs/src/lib/runtime-factory.server.test.ts",
  "apps/docs/src/lib/runtime-factory.server.ts",
  "apps/docs/src/lib/runtime.server.ts",
  "apps/docs/src/server.ts",
  "apps/docs/scripts/test-cloudflare-built.tsx",
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "packages/infrastructure/src/cloudflare/website.test.ts",
  "apps/docs/vite.config.ts",
  "apps/web/src/lib/runtime.client.ts",
  "apps/web/src/lib/runtime.server.ts",
  "packages/docs-content/src/validate.runtime.ts",
  "packages/scripts/src/release-readiness/present.runtime.ts",
  "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  "packages/scripts/src/release-readiness/cli.test.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "packages/sdk/typescript/src/index.ts",
  "tools/oxlint/fixtures/bun-accepted.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/repository-paths/check.runtime.test.ts",
  "tools/repository-paths/check.runtime.ts",
  "tools/quality-workflow/check.runtime.ts",
  "tools/quality-workflow/policy.test.ts",
  "tools/quality-workflow/release-boundary.test.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/check.runtime.test.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/documentation/runbook-policy.test.ts",
  "tools/evals/hgi-206/check.runtime.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/governance/check.runtime.ts",
  "tools/governance/policy.test.ts",
  "tools/docs-deployment/check.runtime.ts",
  "tools/docs-deployment/automation.check.runtime.ts",
  "tools/docs-deployment/automation.policy.test.ts",
  "tools/docs-deployment/doppler-custody.runtime.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/inventory.service.test.ts",
  "tools/docs-deployment/policy.test.ts",
  "tools/docs-deployment/alchemy-memo.test.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/workflow-artifact.runtime.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "tools/docs-deployment/workflow-plan-projection.runtime.ts",
  "tools/docs-deployment/workflow-plan-projection.test.ts",
  "tools/docs-deployment/workflow-proof-check.runtime.ts",
  "tools/docs-deployment/workflow-input-check.runtime.ts",
  "tools/docs-deployment/workflow-run-check.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
  "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
];

const processBoundaryFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/docs/scripts/check-import-boundaries.ts",
  "apps/docs/scripts/test-cloudflare-built.tsx",
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "apps/docs/scripts/test-built.tsx",
  "apps/docs/vitest.browser.config.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/evals/hgi-206/check.runtime.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/governance/check.runtime.ts",
  "tools/docs-deployment/check.runtime.ts",
  "tools/docs-deployment/automation.check.runtime.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/local-doppler.test.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "tools/docs-deployment/workflow-proof-check.runtime.ts",
  "tools/docs-deployment/workflow-input-check.runtime.ts",
  "tools/docs-deployment/workflow-run-check.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
  "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
];

const consoleBoundaryFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/docs/scripts/check-import-boundaries.ts",
  "apps/docs/scripts/test-cloudflare-built.tsx",
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "apps/docs/scripts/test-built.tsx",
  "packages/docs-content/src/validate.runtime.ts",
  "packages/scripts/src/release-readiness/present.runtime.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/evals/hgi-206/check.runtime.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/governance/check.runtime.ts",
  "tools/docs-deployment/check.runtime.ts",
  "tools/docs-deployment/automation.check.runtime.ts",
  "tools/docs-deployment/doppler-custody.runtime.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/workflow-artifact.runtime.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "tools/docs-deployment/workflow-proof-check.runtime.ts",
  "tools/docs-deployment/workflow-input-check.runtime.ts",
  "tools/docs-deployment/workflow-run-check.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
  "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
];

const bunAdapterFiles = [
  "apps/api/src/server.ts",
  "apps/docs/scripts/check-import-boundaries.ts",
  "apps/docs/scripts/test-cloudflare-built.tsx",
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "apps/docs/scripts/test-built.tsx",
  "packages/sdk/typescript/scripts/check-import-boundaries.ts",
  "tools/oxlint/fixtures/bun-accepted.ts",
  "tools/oxlint/no-bare-effect-try-promise.test.ts",
  "tools/oxlint/no-decoding-outside-boundaries.test.ts",
  "tools/oxlint/no-route-transport-restore-outside-consumers.test.ts",
  "tools/oxlint/portable-rules.test.ts",
  "tools/quality-workflow/release-boundary.test.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/documentation/runbook-check.runtime.test.ts",
  "tools/evals/hgi-206/check.runtime.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/governance/check.runtime.ts",
  "tools/docs-deployment/check.runtime.ts",
  "tools/docs-deployment/automation.check.runtime.ts",
  "tools/docs-deployment/doppler-custody.runtime.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/workflow-artifact.runtime.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "tools/docs-deployment/workflow-proof-check.runtime.ts",
  "tools/docs-deployment/workflow-input-check.runtime.ts",
  "tools/docs-deployment/workflow-run-check.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
  "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
];

const bunRuntimeEntrypointFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/api/src/index.ts",
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "packages/docs-content/src/validate.runtime.ts",
  "packages/scripts/src/release-readiness/present.runtime.ts",
  "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "tools/oxlint/fixtures/bun-accepted.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/repository-paths/check.runtime.ts",
  "tools/quality-workflow/check.runtime.ts",
  "tools/quality-workflow/release-boundary.test.ts",
  "tools/evals/hgi-206/check.runtime.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/governance/check.runtime.ts",
  "tools/docs-deployment/check.runtime.ts",
  "tools/docs-deployment/automation.check.runtime.ts",
  "tools/docs-deployment/doppler-custody.runtime.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/workflow-artifact.runtime.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "tools/docs-deployment/workflow-proof-check.runtime.ts",
  "tools/docs-deployment/workflow-input-check.runtime.ts",
  "tools/docs-deployment/workflow-run-check.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
  "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
  "tools/docs-deployment/workflow-plan-projection.runtime.ts",
];

export default defineConfig({
  extends: [core, taxkitReact, remix],
  ignorePatterns: [
    ".agents/**",
    ".claude/**",
    "apps/web/src/routeTree.gen.ts",
    "dist/**",
    ".output/**",
    ".tanstack/**",
    ".turbo/**",
    ".vercel/**",
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [
    "./tools/oxlint/bun-rules.js",
    "./tools/oxlint/effect-rules.js",
    "./tools/oxlint/mdx-rules.js",
    "./tools/oxlint/package-rules.js",
    "./tools/oxlint/taxkit-rules.js",
    {
      name: "anti-slop",
      specifier: "./tools/oxlint/anti-slop/index.ts",
    },
    {
      name: "anti-slop-effect",
      specifier: "./tools/oxlint/anti-slop/effect/index.ts",
    },
  ],
  overrides: [
    {
      files: ["**/*.{ts,tsx,mts,cts}"],
      rules: {
        "no-redeclare": "off",
      },
    },
    {
      // Effect v4's Schema.TaggedError factory is a class base. Oxlint
      // mistakes its class declaration for an Error thrown without `new`.
      files: [
        "**/errors.ts",
        "**/errors/*.ts",
        "**/schemas.ts",
        "**/*.schemas.ts",
        "tools/docs-deployment/workflow-plan-projection.ts",
      ],
      rules: {
        "unicorn/throw-new-error": "off",
      },
    },
    {
      files: portableEffectSourceFiles,
      rules: {
        "effect/no-bare-effect-try-promise": "error",
      },
    },
    {
      files: ["packages/calculators/src/**/*.ts"],
      rules: {
        "taxkit/no-ambient-time-or-random": "error",
        "taxkit/no-async-await-promise": "error",
        "taxkit/no-conditional-object-spread": "error",
        "taxkit/no-context-nullish-default": "error",
        "taxkit/no-in-operator": "error",
        "taxkit/no-instanceof": "error",
        "taxkit/no-json-parse-stringify": "error",
        "taxkit/no-native-array-methods": "error",
        "taxkit/no-native-collections": "error",
        "taxkit/no-nested-wrapper-calls": "error",
        "taxkit/no-nullish-comparison": "error",
        "taxkit/no-throw": "error",
        "taxkit/no-typeof": "error",
        "taxkit/no-undefined-comparison": "error",
      },
    },
    {
      files: effectContractFiles,
      rules: {
        "effect/no-host-imports-in-contracts": "error",
      },
    },
    {
      files: effectServiceContractFiles,
      rules: {
        "effect/no-layer-exports-in-service-files": "error",
        "effect/no-unknown-service-contract": "error",
      },
    },
    {
      files: effectErrorContractFiles,
      rules: {
        "effect/no-unknown-tagged-error-cause": "error",
      },
    },
    {
      files: [
        "**/*.{test,spec}.{ts,tsx,js,jsx}",
        "tools/oxlint/fixtures/effect-accepted.ts",
        "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
        "tools/oxlint/fixtures/.generated-effect-rejected.ts",
      ],
      rules: {
        "effect/no-effect-test-global-mix": "error",
        "effect/no-module-level-mutable-test-state": "error",
      },
    },
    {
      files: [
        "apps/docs/src/routes/**/*.tsx",
        "tools/oxlint/fixtures/mdx-accepted.tsx",
        "tools/oxlint/fixtures/.generated-mdx-rejected.tsx",
      ],
      rules: {
        "mdx/no-route-local-component-registry": "error",
      },
    },
    {
      files: decodingBoundaryFiles,
      rules: {
        "taxkit/no-decoding-outside-boundaries": "off",
      },
    },
    {
      files: schemaEncoderEgressFiles,
      rules: {
        "effect/no-schema-encoder-outside-egress": "off",
      },
    },
    {
      files: throwingCodecTestFiles,
      rules: {
        "effect/no-throwing-schema-sync-codec": "off",
      },
    },
    {
      files: runtimeBoundaryFiles,
      rules: {
        "effect/no-runtime-execution-outside-boundaries": "off",
      },
    },
    {
      files: processBoundaryFiles,
      rules: {
        "effect/no-process-outside-boundaries": "off",
      },
    },
    {
      files: consoleBoundaryFiles,
      rules: {
        "effect/no-console-outside-runtime": "off",
      },
    },
    {
      files: bunAdapterFiles,
      rules: {
        "bun/no-host-api-outside-adapters": "off",
      },
    },
    {
      files: bunRuntimeEntrypointFiles,
      rules: {
        "bun/no-runtime-outside-entrypoints": "off",
      },
    },
    {
      // The browser harness uses programmatic routes to prove the production
      // boundary without adding a production file route.
      files: ["apps/docs/src/lib/docs/route-boundary.browser.test.tsx"],
      rules: {
        "taxkit/no-route-transport-restore-outside-consumers": "off",
      },
    },
  ],
  rules: {
    "anti-slop-effect/no-service-constructor-imports": "error",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    "bun/no-host-api-outside-adapters": "error",
    "bun/no-runtime-outside-entrypoints": "error",
    "effect/no-console-outside-runtime": "error",
    "effect/no-manual-tag": "error",
    "effect/no-process-outside-boundaries": "error",
    "effect/no-runtime-execution-outside-boundaries": "error",
    "effect/no-schema-encoder-outside-egress": "error",
    "effect/no-switch": "error",
    "effect/no-throwing-schema-sync-codec": "error",
    "func-name-matching": "off",
    "func-names": "off",
    "max-classes-per-file": "off",
    "no-restricted-properties": [
      "error",
      {
        message:
          "Use Effect primitives such as HashMap, HashSet, Record, Array, or a typed iterator instead of Object.entries.",
        object: "Object",
        property: "entries",
      },
      {
        message:
          "Use Effect primitives such as HashMap, HashSet, Record, Array, or a typed builder instead of Object.fromEntries.",
        object: "Object",
        property: "fromEntries",
      },
      {
        message:
          "Use Effect primitives such as HashMap, HashSet, Record, Array, or a typed iterator instead of Object.keys.",
        object: "Object",
        property: "keys",
      },
      {
        message:
          "Use Effect primitives such as HashMap, HashSet, Record, Array, or a typed iterator instead of Object.values.",
        object: "Object",
        property: "values",
      },
    ],
    "package/no-cross-package-source-imports": "error",
    // Effect pipelines intentionally use callback combinators like
    // Effect.mapError/Effect.flatMap instead of async/await.
    "promise/prefer-await-to-callbacks": "off",
    "taxkit/no-decoding-outside-boundaries": "error",
    "taxkit/no-route-transport-restore-outside-consumers": [
      "error",
      {
        routeTransportBoundaryModules,
        routeTransportConsumerFiles,
      },
    ],
    "typescript/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "never",
      },
    ],
    "typescript/no-non-null-assertion": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-unsafe-type-assertion": "error",
    // Effect Array supports data-first calls like Array.filter(items, predicate);
    // this Unicorn rule misreads that second argument as a native Array thisArg.
    "unicorn/no-array-method-this-argument": "off",
  },
});
