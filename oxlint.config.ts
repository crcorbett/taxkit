import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import remix from "ultracite/oxlint/remix";

const decodingBoundaryFiles = [
  // Application configuration, executable smoke checks and checked examples.
  "apps/api/src/config.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/docs/examples/browser-http.ts",
  "apps/docs/examples/node-server.ts",
  "apps/docs/src/lib/docs/loaders.ts",
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/docs/route-boundary.ts",
  "apps/docs/src/lib/docs/route-boundary.test.js",

  // Docs content and rendering-library representation boundaries.
  "packages/docs-content/src/live.layer.ts",
  "packages/docs-content/src/validation/policy.runtime.test.ts",
  "packages/docs-content/src/validation/policy.ts",
  "packages/docs-fumadocs/src/config.ts",

  // Public API normalisation and focused API contract tests.
  "packages/api/http/src/openapi.ts",
  "packages/api/http/__tests__/openapi-snapshot.test.ts",
  "packages/api/http/__tests__/public-calculation-api.test.ts",

  // Focused lint integration test: CLI output is decoded at the process boundary.
  "tools/oxlint/no-decoding-outside-boundaries.test.ts",
  "tools/oxlint/portable-rules.test.ts",
  "tools/oxlint/no-route-transport-restore-outside-consumers.test.ts",

  // Dynamic dispatch and its transitional repeated scenario decodes.
  "packages/calculators/src/catalog.ts",
  "packages/calculators/src/errors.ts",
  "packages/rules/au/income-tax/src/calculator/annual-tax.boundary.ts",
  "packages/rules/au/pay/src/calculator/take-home-pay.boundary.ts",

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

const schemaEncoderEgressFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/docs/src/lib/docs/route-boundary.ts",
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/docs/route-boundary.test.js",
  "tools/oxlint/fixtures/effect-accepted.ts",
];

const throwingCodecTestFiles = [
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/docs/route-boundary.test.js",
  "packages/docs-content/src/validation/policy.runtime.test.ts",
];

const runtimeBoundaryFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/api/src/index.ts",
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/docs/route-boundary.test.js",
  "apps/docs/src/lib/runtime.client.ts",
  "apps/docs/src/lib/runtime.server.ts",
  "apps/web/src/lib/runtime.client.ts",
  "apps/web/src/lib/runtime.server.ts",
  "packages/docs-content/src/validate.runtime.ts",
  "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "packages/sdk/typescript/src/index.ts",
  "tools/oxlint/fixtures/bun-accepted.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
];

const processBoundaryFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/docs/vitest.browser.config.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
];

const consoleBoundaryFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "packages/docs-content/src/validate.runtime.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
];

const bunAdapterFiles = [
  "apps/api/src/server.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.ts",
  "tools/oxlint/fixtures/bun-accepted.ts",
  "tools/oxlint/no-decoding-outside-boundaries.test.ts",
  "tools/oxlint/no-route-transport-restore-outside-consumers.test.ts",
  "tools/oxlint/portable-rules.test.ts",
];

const bunRuntimeEntrypointFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/api/src/index.ts",
  "packages/docs-content/src/validate.runtime.ts",
  "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "tools/oxlint/fixtures/bun-accepted.ts",
];

export default defineConfig({
  extends: [core, react, remix],
  ignorePatterns: [
    "apps/web/src/routeTree.gen.ts",
    "dist/**",
    ".output/**",
    ".tanstack/**",
    ".turbo/**",
    ".vercel/**",
  ],
  jsPlugins: [
    "./tools/oxlint/bun-rules.js",
    "./tools/oxlint/effect-rules.js",
    "./tools/oxlint/mdx-rules.js",
    "./tools/oxlint/whattax-rules.js",
  ],
  overrides: [
    {
      files: ["packages/calculators/src/**/*.ts"],
      rules: {
        "whattax/no-ambient-time-or-random": "error",
        "whattax/no-async-await-promise": "error",
        "whattax/no-conditional-object-spread": "error",
        "whattax/no-context-nullish-default": "error",
        "whattax/no-in-operator": "error",
        "whattax/no-instanceof": "error",
        "whattax/no-json-parse-stringify": "error",
        "whattax/no-native-array-methods": "error",
        "whattax/no-native-collections": "error",
        "whattax/no-nested-wrapper-calls": "error",
        "whattax/no-nullish-comparison": "error",
        "whattax/no-throw": "error",
        "whattax/no-typeof": "error",
        "whattax/no-undefined-comparison": "error",
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
        "whattax/no-decoding-outside-boundaries": "off",
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
        "whattax/no-route-transport-restore-outside-consumers": "off",
      },
    },
  ],
  rules: {
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
    // Effect pipelines intentionally use callback combinators like
    // Effect.mapError/Effect.flatMap instead of async/await.
    "promise/prefer-await-to-callbacks": "off",
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
    "whattax/no-decoding-outside-boundaries": "error",
    "whattax/no-route-transport-restore-outside-consumers": [
      "error",
      {
        routeTransportBoundaryModules,
        routeTransportConsumerFiles,
      },
    ],
  },
});
