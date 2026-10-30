import { strict, style } from "@commonplaces/oxlint-plugin";
import { defineConfig } from "oxlint";

import { workspaceBoundaryOptions } from "./tools/oxlint/workspaces.boundary.ts";

const decodingBoundaryFiles = [
  // Build-time ingress of the bundled authored docs source list.
  "apps/api/src/build/docs-catalogue.layer.ts",
  // Native heterogeneous resource-map props in the in-memory provider lifecycle test.
  "packages/infrastructure/test/posthog/projects.test.ts",
  "packages/observability/test/edge-identity.test.ts",
  "tools/infrastructure/release-gates.boundary.test.ts",
  "apps/web/test/pages/root-load.boundary.test.ts",
  // Local package-manifest ingress for the documentation command check.
  "tools/documentation/check.boundary.ts",
  "tools/workspace/dependencies.boundary.test.ts",
  "tools/oxlint/workspaces.boundary.ts",
  "tools/oxlint/workspace-imports.boundary.test.ts",
  "packages/observability/test/host-telemetry.boundary.test.ts",
  "apps/web/test/host/binding.boundary.test.ts",
  // Closed native PostHog SDK ingress; no runner or neighbouring-file permission.
  "packages/infrastructure/src/posthog/management.adapter.layer.ts",
  "packages/infrastructure/test/posthog/management.boundary.test.ts",
  // Exact collection header and native browser preference ingress only.
  "packages/analytics/src/collection-policy.boundary.ts",
  // Exact synthetic analytics representation fixture; no runtime or encoder.
  "packages/analytics/src/__testing__/fixtures.ts",
  // Actual installed provider request bytes at the mocked network boundary.
  // No provider, credential, profile or runtime-execution permission.
  "packages/infrastructure/test/native-domains-provider.boundary.test.ts",
  // Evaluated memory-plan props of the telemetry stacks; no provider writes.
  "packages/infrastructure/test/telemetry.test.ts",
  // Exact native browser capability/refusal ingress; no runner permission.
  "packages/webmcp/src/model-context.adapter.layer.ts",
  "packages/webmcp/test/registration.test.ts",
  "apps/web/test/native-browser-tools.boundary.test.ts",
  // Exact official MCP client wire ingress and adversarial host fixture.
  "apps/api/test/mcp-client.boundary.test.ts",
  "apps/web/test/native-mcp.boundary.test.ts",
  "apps/web/test/native-rate.boundary.test.ts",
  // Exact Accept header ingress fixtures.
  "packages/api/http/test/negotiation.test.ts",
  // Exact Takumi PNG reply, bundled font and forwarded share-image ingress.
  "packages/og-image/src/takumi.adapter.layer.ts",
  "packages/og-image/test/render.test.ts",
  "packages/og-image/test/font.test.ts",
  "packages/aeo/src/__testing__/fixtures.ts",
  "packages/aeo/test/documents.test.ts",
  "packages/aeo/test/routes.test.ts",
  "apps/web/src/lib/http/image.ingress.ts",
  "apps/web/test/http/image.boundary.test.ts",
  // Exact acceptance JSON, external example JSON and raw HTTP error ingress.
  "packages/docs-examples/src/validate-external-input.ts",
  "packages/docs-examples/src/api-error-envelope.ts",
  "packages/docs-examples/test/integration.example.test.ts",
  // Authored docs ingress: Content's navigation and link profile JSON, the
  // MDX parser and its syntax tree, and the highlighter and diagram replies.
  "packages/content/src/live.layer.ts",
  "packages/mdx/src/mdx.ingress.ts",
  "packages/mdx/src/body.ingress.ts",
  "packages/mdx/src/highlights.adapter.layer.ts",
  "packages/diagrams/src/mermaid.adapter.layer.ts",
  "packages/content/test/reading.test.ts",
  "packages/mdx/test/reader.test.ts",
  // Exact public catalogue wire and adversarial ingress fixtures only.
  "packages/content/src/__testing__/fixtures.ts",
  "packages/content/test/schemas.test.ts",
  "packages/content/test/service.test.ts",
  // Exact native connection, private-call and provider-reply trust boundaries.
  // No encoder, runner, cast, mutation or neighbouring-path permission.
  "packages/observability/src/edge-identity.boundary.ts",
  "apps/api/src/worker.application.ts",
  "apps/api/src/worker-admission.layer.ts",
  // Exact native rate wire/provider fixtures and redacted-key codec checks.
  "apps/api/test/rate-admission.boundary.test.ts",
  "apps/api/test/worker-admission.boundary.test.ts",
  "packages/calculators/test/calculation-admission.test.ts",
  // Exact encoded date representation ingress and historical round-trip test.
  // No runtime, raw JSON or synchronous codec admission.
  "packages/core/src/primitives/date.ts",
  "packages/core/test/date.test.ts",
  // Typed dollar text representation ingress and Money round trips.
  "packages/core/test/dollars.test.ts",
  // Historical trace and question representation round trips only.
  "packages/core/test/domain-absence.boundary.test.ts",
  // Native app root stage ingress, checked before constructing secret Layers.
  "packages/infrastructure/src/secrets.ts",
  "apps/web/test/native-cancellation.boundary.test.ts",
  "apps/web/test/native-local-development.boundary.test.ts",
  // Exact native website settings, form and hydration boundaries.
  "apps/web/test/host/config.boundary.test.ts",
  "apps/web/src/lib/host/config.ingress.ts",
  // Native API host binding ingress, route-address ingress and generated
  // reply kind checks; loader fixtures restore only their own route data.
  "apps/web/src/lib/host/binding.adapter.layer.ts",
  "packages/api/http/src/requests.ts",
  "apps/web/test/pages/browser-loaders.boundary.browser.test.tsx",
  // Scenario input Schema rejection tests.
  "packages/rules/au/income-tax/test/annual-tax.test.ts",
  "packages/rules/au/pay/test/take-home-pay.test.ts",
  "apps/web/src/lib/docs/search-location.ingress.ts",
  // Exact original-URL/representation-header HTTP ingress and bounded fixtures.
  // No encoder, runner or neighbouring-module admission.
  "apps/web/test/http/negotiation.boundary.test.ts",
  "apps/web/src/lib/http/negotiation.ingress.ts",
  "apps/web/test/calculators/calculator.boundary.browser.test.tsx",
  "packages/calculators/src/form.ingress.ts",
  "apps/web/src/routes/__root.tsx",
  "apps/web/src/entry.server.ts",
  "apps/api/src/verification/routes.ts",
  "apps/api/test/config.test.ts",
  "packages/sdk/typescript/test/scripts/script-boundaries.test.ts",
  // Exact synthetic register fixture ingress; no command execution admission.
  // Exact synchronous Oxlint rule-options ingress, decoded once and fail-closed.
  "tools/oxlint/taxkit-rules.ts",
  // Application configuration, executable smoke checks and checked examples.
  "apps/api/src/config.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "packages/docs-examples/src/browser-http.ts",
  "packages/docs-examples/src/node-server.ts",

  "packages/infrastructure/src/cloudflare/website.test.ts",
  "packages/infrastructure/src/cloudflare/website.ts",

  // Native built request egress and standalone HTTP body tests decode only
  // actual representation responses; service internals remain excluded.
  "apps/web/test/native-pair.boundary.test.ts",
  "apps/web/test/native-analytics.boundary.test.ts",
  "apps/api/test/worker.boundary.test.ts",
  "packages/api/http/test/request-body.boundary.test.ts",
  "packages/api/http/test/public-content.boundary.test.ts",
  "apps/api/src/content.boundary.ts",

  // Public API normalisation and focused API contract tests.
  "packages/api/http/src/openapi.ts",
  "packages/api/http/test/openapi-snapshot.test.ts",
  "packages/sdk/typescript/test/http-parity.test.ts",

  // Focused lint integration test: CLI output is decoded at the process boundary.
  "tools/oxlint/cli-fixture.ts",
  "tools/oxlint/no-decoding-outside-boundaries.test.ts",
  "tools/oxlint/portable-rules.test.ts",
  "tools/oxlint/native-request-rules.test.ts",
  "tools/oxlint/lexical-policy.test.ts",
  "tools/documentation/check.runtime.ts",
  // Synthetic report ingress for the inventory caller and output boundary.
  "tools/repository-paths/check.runtime.ts",
  "tools/repository-paths/policy.test.ts",
  "tools/repository-paths/policy.ts",
  // Exact child-process UTF-8 output boundary; no runtime admission.

  // Heterogeneous catalogue dispatch and public unknown-input scenario boundaries.
  "packages/calculators/src/catalog.ts",
  "packages/calculators/src/errors.ts",

  // Release-evidence decoders and their adversarial boundary fixtures.
  // Cross-process command output restored by the release-readiness live layer.

  // SDK rejected Promise ingress and descriptor/process boundaries.
  "packages/sdk/typescript/test/index.test.ts",
  // Selected domain-report Type versus encoded representation regression test.
  "packages/sdk/typescript/test/effect.test.ts",
  "packages/sdk/typescript/test/client-lifetime.test.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/scripts/assemble-package.runtime.ts",
  "packages/sdk/typescript/src/effect.ts",
  "packages/sdk/typescript/src/types.ts",
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

// Inline Promise rejection mapping applies to every owned source extension.
const portableEffectSourceFiles = ["**/*.{cjs,mjs,jsx,js,tsx,ts}"];

const schemaEncoderEgressFiles = [
  // The synchronous native logger encodes its fixed record at console egress.
  "packages/observability/src/host-telemetry.ts",
  // Persisted docs catalogue written by the API build.
  "apps/api/scripts/docs-catalogue.runtime.ts",
  "packages/observability/test/edge-identity.test.ts",
  "apps/web/test/pages/root-load.boundary.test.ts",
  "apps/web/test/host/requests.boundary.test.ts",
  "apps/web/src/lib/pages/root.load.ts",
  // Generated public catalogue file egress.
  // Synthetic PostHog HTTP fixture representation only.
  "packages/infrastructure/test/posthog/management.boundary.test.ts",
  // Exact native PostHog capture request and safe configuration error bytes.
  // No decoder, runtime runner, raw JSON or neighbouring-file permission.
  "packages/analytics/src/live.layer.ts",
  "packages/analytics/test/schemas.test.ts",
  // Mock Cloudflare HTTP reply egress for the actual installed provider tests.
  "packages/infrastructure/test/native-domains-provider.boundary.test.ts",
  // Exact fixed browser-tool failure response at the native callback.
  "packages/webmcp/src/model-context.adapter.layer.ts",
  // Actual MCP client request bytes and secret-negative response assertions.
  "apps/api/test/mcp-client.boundary.test.ts",
  "apps/web/test/native-mcp.boundary.test.ts",
  // Exact checked public structured-data script egress; no decoder/runtime permission.
  "packages/content/src/publication.egress.ts",
  // The encoded tool failure the browser's WebMCP host receives.
  "packages/webmcp/src/registration.egress.ts",
  // Exact public catalogue representation round-trip proof, not a service encoder.
  "packages/content/test/schemas.test.ts",
  // Exact rate wire/secret-negative fixtures; no production encoding permission.
  "apps/api/test/rate-admission.boundary.test.ts",
  "apps/api/test/worker-admission.boundary.test.ts",
  "apps/web/test/native-rate.boundary.test.ts",
  "apps/web/test/native-rate-provider.boundary.test.ts",
  "packages/calculators/test/calculation-admission.test.ts",
  // Exact historical domain bytes and rule snapshots, using their owning codecs.
  "packages/core/test/domain-absence.boundary.test.ts",
  "packages/rules/au/income-tax/test/annual-tax.test.ts",
  "packages/rules/au/stsl/test/take-home-pay-stsl.test.ts",
  // Rule snapshot egress uses the canonical date codec and preserves saved snapshots.
  "packages/rules/au/income-tax/test/rule-graph.test.ts",
  "packages/rules/au/pay/test/rule-graph.test.ts",
  "packages/rules/au/stsl/test/rule-graph.test.ts",
  // Exact historical primitive bytes and safe failure representation tests.
  "packages/core/test/date.test.ts",
  "packages/core/test/dollars.test.ts",
  "packages/core/test/money.test.ts",
  "apps/web/test/native-cancellation.boundary.test.ts",
  "apps/web/test/native-settings-failure.boundary.test.ts",
  "apps/web/test/native-analytics.boundary.test.ts",
  "apps/web/test/native-pair.boundary.test.ts",
  "apps/api/test/worker.boundary.test.ts",

  "apps/web/test/calculators/calculator.boundary.browser.test.tsx",
  // Route loader data egress and checked local input-error transport egress.
  "apps/web/src/lib/pages/loaders.ts",
  "apps/web/src/lib/runtime.client.ts",
  "apps/web/src/lib/runtime.server.ts",
  "apps/web/test/pages/browser-loaders.boundary.browser.test.tsx",
  "apps/web/src/entry.server.ts",
  "apps/web/test/host/config.boundary.test.ts",
  // Exact negative wire fixtures; native encoding only, no decoder/runtime/throwing codec admission.

  "apps/api/test/smoke-boundaries.test.ts",
  "apps/api/test/config.test.ts",
  "packages/sdk/typescript/test/scripts/script-boundaries.test.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  // Plain Promise rejection and calculator error representations: secret-negative tests only.
  "packages/sdk/typescript/test/index.test.ts",
  "packages/sdk/typescript/test/effect.test.ts",
  "packages/sdk/typescript/test/client-lifetime.test.ts",
  // Canonical JSON bytes used only to bind immutable saved-record fingerprints.
  // Exact saved-plan JSON and synthetic provider fixture representations.
  // Exact credential/YAML/receipt negative-fixture representations only.
  "packages/docs-examples/src/node-server.ts",
  // Exact historical skill representation test uses the Candidate-owned Schema.
  "packages/api/http/test/openapi-snapshot.test.ts",
  "packages/sdk/typescript/test/http-parity.test.ts",
  // Exact representation-boundary tests: deterministic report bytes and secret-negative error JSON.
  "packages/rules/au/pay/test/take-home-pay.test.ts",
  "packages/calculators/test/public-calculator-service.test.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",

  "tools/oxlint/fixtures/effect-accepted.ts",
  // Exact acceptance-record and command-fixture representation tests.
  "tools/documentation/check.runtime.ts",
];

const throwingCodecTestFiles = [
  // Oxlint requires synchronous checked configuration before creating rules.
  "tools/oxlint/workspaces.boundary.ts",
];

const runtimeBoundaryFiles = [
  // Official MCP transport callback bridges the native HttpClient to its Promise host.
  "apps/web/test/native-mcp.boundary.test.ts",
  "apps/api/scripts/docs-catalogue.runtime.ts",
  "packages/sdk/typescript/scripts/assemble-package.runtime.ts",
  // Synthetic fetch Promise entrypoint for deterministic discovery cancellation.
  "apps/web/test/host/forward.boundary.test.ts",
  "tools/apps-local/native-pair-build.runtime.ts",

  "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
  "packages/sdk/typescript/src/client.runtime.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/api/src/index.ts",

  "apps/web/vite.config.ts",
  "apps/web/src/lib/runtime.server.ts",
  "apps/web/src/lib/runtime.client.ts",
  "apps/web/src/lib/pages/loaders.ts",
  "apps/web/src/entry.server.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "tools/oxlint/fixtures/bun-accepted.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/repository-paths/check.runtime.test.ts",
  "tools/repository-paths/check.runtime.ts",
  "tools/documentation/check.runtime.ts",
];

const processBoundaryFiles = [
  "apps/api/scripts/smoke-public-routes.runtime.ts",

  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/documentation/check.runtime.ts",
];

const consoleBoundaryFiles = [
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/documentation/check.runtime.ts",
];

const bunAdapterFiles = [
  "apps/api/src/server.ts",

  "tools/oxlint/fixtures/bun-accepted.ts",
];

const bunRuntimeEntrypointFiles = [
  "apps/api/scripts/docs-catalogue.runtime.ts",
  "packages/sdk/typescript/scripts/assemble-package.runtime.ts",
  "tools/apps-local/native-pair-build.runtime.ts",

  "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/api/src/index.ts",

  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "tools/oxlint/fixtures/bun-accepted.ts",
  "tools/documentation/check.runtime.ts",
  "tools/repository-paths/check.runtime.ts",
];

export default defineConfig({
  extends: [style, strict],
  ignorePatterns: [
    ".agents/**",
    ".claude/**",
    "apps/web/src/routeTree.gen.ts",
    "apps/web/src/worker-runtime.generated.d.ts",
    "dist/**",
    ".output/**",
    ".tanstack/**",
    ".turbo/**",
    ".vercel/**",
  ],
  jsPlugins: [
    { name: "taxkit-bun", specifier: "./tools/oxlint/bun-rules.ts" },
    { name: "taxkit-effect", specifier: "./tools/oxlint/effect-rules.ts" },
    "./tools/oxlint/package-rules.ts",
    "./tools/oxlint/taxkit-rules.ts",
  ],
  overrides: [
    {
      files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
      rules: {
        // Register native Effect test callbacks; assertions still require a test body.
        // Vitest accepts an optional assertion failure message.
        "vitest/valid-expect": ["error", { maxArgs: 2 }],
        "vitest/no-standalone-expect": [
          "error",
          {
            additionalTestBlockFunctions: [
              "Effect.fnUntraced",
              "it.effect",
              "it.effect.each",
              "it.scoped",
              "it.scoped.each",
              "it.live",
              "it.live.each",
              "test.effect",
              "test.effect.each",
              "test.scoped",
              "test.scoped.each",
              "test.live",
              "test.live.each",
            ],
          },
        ],
      },
    },
    // Runtime addresses come from the hostname and transport-route owners.
    {
      files: [
        "apps/*/src/**/*.{ts,tsx}",
        "packages/infrastructure/src/**/*.ts",
        "packages/api/*/src/**/*.ts",
        "packages/analytics/src/**/*.ts",
        "packages/content/src/**/*.ts",
        "packages/observability/src/**/*.ts",
      ],
      rules: {
        "strict-effect/public-host-literals": [
          "error",
          {
            allowTestFiles: true,
            allowedDeclarations: [
              {
                file: "packages/infrastructure/src/hostnames.ts",
                names: ["taxKitZoneName"],
              },
            ],
            allowedFiles: ["packages/infrastructure/src/hostnames.ts"],
            hosts: ["taxkit.dev"],
          },
        ],
        "strict-effect/route-literal-ownership": [
          "error",
          {
            allowTestFiles: true,
            allowedFiles: [
              "packages/api/http/src/routes.ts",
              "packages/infrastructure/src/posthog/management.adapter.layer.ts",
            ],
            prefixes: ["/api", "/mcp"],
          },
        ],
      },
    },
    {
      // The analytics owners use native HttpClient. A decoder/encoder permission
      // does not admit bare browser or server fetch in these new files.
      files: [
        "packages/analytics/src/**/*.ts",
        "packages/infrastructure/src/posthog/**/*.ts",
        "apps/api/src/analytics-request.boundary.ts",
        "packages/analytics/src/api-usage.layer.ts",
      ],
      rules: {
        "no-restricted-globals": [
          "error",
          {
            message: "Use the application-owned native Effect HttpClient.",
            name: "fetch",
          },
        ],
      },
    },
    {
      // All owned source extensions are strict, including future app/tool/config paths.
      // Five unexecuted inputs intentionally exercise other rules in isolation.
      // Their neighbours remain strict; these are fixture inputs, never workflow hosts.
      excludeFiles: [
        "tools/oxlint/fixtures/bun-accepted.ts",
        "tools/oxlint/fixtures/bun-global-non-host-accepted.ts",
        "tools/oxlint/fixtures/bun-unrelated-accepted.ts",
        "tools/oxlint/fixtures/effect-accepted.ts",
        "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
      ],
      files: [
        "**/*.{ts,tsx,js,jsx,mjs,cjs}",
        "packages/core/**",
        "packages/rules/**",
        "packages/calculators/**",
        "tools/oxlint/*.ts",
        "tools/oxlint/binding-tracker.ts",
        "tools/oxlint/bun-rules.ts",
        "tools/oxlint/effect-rules.ts",
        "tools/oxlint/package-rules.ts",
        "tools/oxlint/taxkit-rules.ts",
        "tools/oxlint/.generated-strict-bindings.js",
        "tools/repository-paths/**",
        "tools/documentation/**",
        "packages/sdk/typescript/src/**",
        "packages/sdk/typescript/scripts/**",
        "apps/api/**",
        "packages/infrastructure/**",
        "apps/web/**",
        "packages/infrastructure/src/.generated-strict-rejected.ts",

        "packages/sdk/typescript/type-tests/**",
        "packages/sdk/typescript/vitest*.config.ts",
        "packages/testing/**",
        "packages/api/http/**",
      ],
      rules: {
        "strict-effect/no-runtime-outside-boundary": "error",

        "strict-effect/runtime-file-convention": "error",

        "taxkit/no-native-collections": "error",
        "taxkit/no-object-writes": "error",
      },
    },

    {
      // The synthetic fetch host must return a Promise. Its never Effect is
      // cancelled through the native binding's AbortSignal in the deadline test.
      files: ["apps/web/test/host/forward.boundary.test.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/test/host/forward.boundary.test.ts"] },
        ],
      },
    },
    {
      files: ["apps/web/test/native-local-development.boundary.test.ts"],
      rules: {
        "strict-effect/no-imperative-collections": [
          "error",
          {
            allowedMethods: [
              {
                file: "apps/web/test/native-local-development.boundary.test.ts",
                method: "fill",
                receiver: "payInput",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["apps/web/test/native-cancellation.boundary.test.ts"],
      rules: {
        "strict-effect/no-imperative-collections": [
          "error",
          {
            allowedMethods: [
              {
                file: "apps/web/test/native-cancellation.boundary.test.ts",
                method: "fill",
                receiver: "payInput",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["apps/web/test/native-pair.boundary.test.ts"],
      rules: {
        "strict-effect/no-imperative-collections": [
          "error",
          {
            allowedMethods: [
              {
                file: "apps/web/test/native-pair.boundary.test.ts",
                method: "fill",
                receiver: "payInput",
              },
              {
                file: "apps/web/test/native-pair.boundary.test.ts",
                method: "fill",
                receiver: "errorPayInput",
              },
              {
                file: "apps/web/test/native-pair.boundary.test.ts",
                method: "fill",
                receiver: "savedPayInput",
              },
              {
                file: "apps/web/test/native-pair.boundary.test.ts",
                method: "fill",
                receiver: "calculatorInput",
              },
              {
                file: "apps/web/test/native-pair.boundary.test.ts",
                method: "fill",
                receiver: "plainCalculatorInput",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["tools/apps-local/native-pair-build.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/apps-local/native-pair-build.runtime.ts"] },
        ],
      },
    },
    {
      files: ["apps/web/src/lib/pages/loaders.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/src/lib/pages/loaders.ts"] },
        ],
      },
    },
    {
      files: ["apps/web/test/native-mcp.boundary.test.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/test/native-mcp.boundary.test.ts"] },
        ],
      },
    },
    {
      files: ["apps/web/src/entry.server.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/src/entry.server.ts"] },
        ],
      },
    },
    {
      files: ["apps/web/src/lib/runtime.server.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/src/lib/runtime.server.ts"] },
        ],
      },
    },
    {
      // The browser loader runner: one Promise bridge per TanStack loader.
      files: ["apps/web/src/lib/runtime.client.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/src/lib/runtime.client.ts"] },
        ],
      },
    },
    {
      // React replays mount and cleanup in development. The root keeps one
      // ref to cancel a scheduled registry disposal; nothing else mutates.
      files: ["apps/web/src/routes/__root.tsx"],
      rules: {
        "strict-effect/no-imperative-collections": [
          "error",
          {
            allowedAssignments: [
              {
                file: "apps/web/src/routes/__root.tsx",
                target: "pendingDisposal.current",
              },
            ],
            allowedMethods: [],
          },
        ],
      },
    },
    {
      files: ["apps/web/vite.config.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/vite.config.ts"] },
        ],
      },
    },

    {
      files: ["apps/api/src/index.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/api/src/index.ts"] },
        ],
      },
    },
    {
      files: ["apps/api/scripts/docs-catalogue.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/api/scripts/docs-catalogue.runtime.ts"] },
        ],
      },
    },
    {
      files: ["apps/api/scripts/smoke-public-routes.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/api/scripts/smoke-public-routes.runtime.ts"] },
        ],
      },
    },
    {
      files: [
        "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
      ],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: [
        "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
      ],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: [
        "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
      ],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["packages/sdk/typescript/scripts/assemble-package.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "packages/sdk/typescript/scripts/assemble-package.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      // Accepted plain SDK signatures only; client.runtime owns caller lifetime.
      files: ["packages/sdk/typescript/src/client.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["packages/sdk/typescript/src/client.runtime.ts"] },
        ],
      },
    },
    {
      files: ["tools/repository-paths/check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/repository-paths/check.runtime.ts"] },
        ],
      },
    },
    {
      files: ["tools/documentation/check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/documentation/check.runtime.ts"] },
        ],
      },
    },
    {
      files: portableEffectSourceFiles,
      rules: {
        "taxkit-effect/no-bare-effect-try-promise": "error",
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
        "taxkit-effect/no-host-imports-in-contracts": "error",
      },
    },
    {
      files: effectServiceContractFiles,
      rules: {
        "taxkit-effect/no-layer-exports-in-service-files": "error",
        "taxkit-effect/no-unknown-service-contract": "error",
      },
    },
    {
      files: effectErrorContractFiles,
      rules: {
        "taxkit-effect/no-unknown-tagged-error-cause": "error",
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
        "taxkit-effect/no-effect-test-global-mix": "error",
        "taxkit-effect/no-module-level-mutable-test-state": "error",
      },
    },
    {
      files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
      excludeFiles: decodingBoundaryFiles,
      rules: {
        "taxkit/no-decoding-outside-boundaries": "error",
      },
    },
    {
      files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
      excludeFiles: schemaEncoderEgressFiles,
      rules: {
        "taxkit-effect/no-schema-encoder-outside-egress": "error",
      },
    },
    {
      files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
      excludeFiles: throwingCodecTestFiles,
      rules: {
        "taxkit-effect/no-throwing-schema-sync-codec": "error",
      },
    },
    {
      files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
      excludeFiles: runtimeBoundaryFiles,
      rules: {
        "taxkit-effect/no-runtime-execution-outside-boundaries": "error",
        "taxkit-effect/no-runtime-references-outside-boundaries": "error",
      },
    },
    {
      files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
      excludeFiles: processBoundaryFiles,
      rules: {
        "taxkit-effect/no-process-outside-boundaries": "error",
      },
    },
    {
      files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
      excludeFiles: consoleBoundaryFiles,
      rules: {
        "taxkit-effect/no-console-outside-runtime": "error",
      },
    },
    {
      files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
      excludeFiles: bunAdapterFiles,
      rules: {
        "taxkit-bun/no-host-api-outside-adapters": "error",
      },
    },
    {
      files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
      excludeFiles: bunRuntimeEntrypointFiles,
      rules: {
        "taxkit-bun/no-runtime-outside-entrypoints": "error",
      },
    },
    {
      // Synthetic synchronous-host canaries only. They do not admit production
      // mutation; neighbouring paths and unrelated targets/methods stay strict.
      files: [
        "tools/oxlint/.generated-collection-host.ts",
        "tools/oxlint/.generated-collection-neighbour.ts",
      ],
      rules: {
        "strict-effect/no-imperative-collections": [
          "error",
          {
            allowedAssignments: [
              {
                file: "tools/oxlint/.generated-collection-host.ts",
                target: "host.value",
              },
            ],
            allowedMethods: [
              {
                file: "tools/oxlint/.generated-collection-host.ts",
                method: "push",
                receiver: "host",
              },
            ],
          },
        ],
      },
    },
    {
      // The scoped CLI fixture checks Fetch's required Promise result signature.
      // The native in-process client needs no production Promise exception.
      files: ["tools/oxlint/.generated-fetch-host.ts"],
      rules: {
        "strict-effect/no-promise-workflow": [
          "error",
          {
            allowedFiles: ["tools/oxlint/.generated-fetch-host.ts"],
          },
        ],
      },
    },
    {
      // Exact Promise boundaries. Adapters convert one host, SDK, compiler or
      // binding Promise; host-contract tests drive Playwright, Miniflare, MCP
      // and the plain SDK. promiseOnlyFiles admit Effect.promise only.
      files: [
        "apps/api/test/mcp-client.boundary.test.ts",
        "apps/api/test/rate-admission.boundary.test.ts",
        "apps/api/test/worker.boundary.test.ts",
        "packages/og-image/src/takumi.adapter.layer.ts",
        "apps/web/src/lib/host/binding.adapter.layer.ts",
        "apps/web/test/host/forward.boundary.test.ts",
        "apps/web/test/host/requests.boundary.test.ts",
        "apps/web/test/host/binding.boundary.test.ts",
        "apps/web/test/host/binding-redirect.boundary.test.ts",
        "apps/web/test/atom-lifecycle.browser.test.tsx",
        "apps/web/test/pages/browser-loaders.boundary.browser.test.tsx",
        "packages/webmcp/test/registration.test.ts",
        "packages/webmcp/src/model-context.adapter.layer.ts",
        "apps/web/test/calculators/calculator.boundary.browser.test.tsx",
        "apps/web/src/entry.server.ts",
        "apps/web/test/native-analytics.boundary.test.ts",
        "apps/web/test/native-browser-tools.boundary.test.ts",
        "apps/web/test/native-cancellation.boundary.test.ts",
        "apps/web/test/native-local-development.boundary.test.ts",
        "apps/web/test/native-mcp.boundary.test.ts",
        "apps/web/test/native-pair.boundary.test.ts",
        "apps/web/test/native-rate-provider.boundary.test.ts",
        "apps/web/test/native-rate.boundary.test.ts",
        "apps/web/test/native-settings-failure.boundary.test.ts",
        "packages/docs-examples/src/error-handling.ts",
        "packages/docs-examples/src/validate-external-input.ts",
        "packages/docs-examples/test/integration.example.test.ts",
        "packages/sdk/typescript/test/au.test.ts",
        "packages/sdk/typescript/test/client-lifetime.test.ts",
        "packages/sdk/typescript/src/client.runtime.ts",
        "packages/sdk/typescript/test/index.test.ts",
      ],
      rules: {
        "strict-effect/no-promise-workflow": [
          "error",
          {
            allowedFiles: [
              "apps/api/test/mcp-client.boundary.test.ts",
              "packages/og-image/src/takumi.adapter.layer.ts",
              "apps/web/src/lib/host/binding.adapter.layer.ts",
              "apps/web/test/host/forward.boundary.test.ts",
              "apps/web/test/host/requests.boundary.test.ts",
              "apps/web/test/host/binding.boundary.test.ts",
              "apps/web/test/host/binding-redirect.boundary.test.ts",
              "apps/web/test/pages/browser-loaders.boundary.browser.test.tsx",
              "packages/webmcp/test/registration.test.ts",
              "packages/webmcp/src/model-context.adapter.layer.ts",
              "apps/web/src/entry.server.ts",
              "apps/web/test/native-analytics.boundary.test.ts",
              "apps/web/test/native-mcp.boundary.test.ts",
              "packages/sdk/typescript/test/client-lifetime.test.ts",
              "packages/sdk/typescript/src/client.runtime.ts",
              "packages/sdk/typescript/test/index.test.ts",
            ],
            promiseOnlyFiles: [
              "apps/api/test/rate-admission.boundary.test.ts",
              "apps/api/test/worker.boundary.test.ts",
              "apps/web/test/atom-lifecycle.browser.test.tsx",
              "apps/web/test/calculators/calculator.boundary.browser.test.tsx",
              "apps/web/test/native-browser-tools.boundary.test.ts",
              "apps/web/test/native-cancellation.boundary.test.ts",
              "apps/web/test/native-local-development.boundary.test.ts",
              "apps/web/test/native-pair.boundary.test.ts",
              "apps/web/test/native-rate-provider.boundary.test.ts",
              "apps/web/test/native-rate.boundary.test.ts",
              "apps/web/test/native-settings-failure.boundary.test.ts",
              "packages/docs-examples/src/error-handling.ts",
              "packages/docs-examples/src/validate-external-input.ts",
              "packages/docs-examples/test/integration.example.test.ts",
              "packages/sdk/typescript/test/au.test.ts",
            ],
          },
        ],
      },
    },
    {
      // The Website reads the API with native clients: one server runtime,
      // one browser Atom runtime and registry, no server-function endpoint.
      files: ["apps/web/src/**"],
      rules: {
        "strict-effect/website-rpc-boundary": [
          "error",
          {
            browserRuntime: "apps/web/src/lib/api-client.atoms.ts",
            registryTests: [
              "apps/web/test/pages/browser-loaders.boundary.browser.test.tsx",
              "apps/web/test/calculators/calculator.boundary.browser.test.tsx",
            ],
            serverRuntime: "apps/web/src/lib/runtime.server.ts",
          },
        ],
      },
    },
  ],
  rules: {
    "effect-conventions/scoped-managed-runtime": [
      "error",
      {
        hostLifetimes: [
          {
            file: "apps/web/src/lib/runtime.server.ts",
            declaration: "runtime",
          },
        ],
      },
    ],
    "taxkit-effect/no-manual-tag": "error",
    "taxkit-effect/no-switch": "error",

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

    "package/workspace-import-boundaries": ["error", workspaceBoundaryOptions],
    // Effect pipelines intentionally use callback combinators like
    // Effect.mapError/Effect.flatMap instead of async/await.

    "strict-effect/module-ownership": [
      "error",
      {
        owners: [
          {
            allowTypes: false,
            allowedFiles: [
              "packages/infrastructure/src/posthog/management.adapter.layer.ts",
            ],
            module: "@distilled.cloud/posthog",
          },
          // Worker bindings are read at the Website's server runtime only.
          {
            allowTypes: true,
            allowedFiles: [
              "apps/web/src/lib/runtime.server.ts",
              "apps/web/test/native-pair.boundary.test.ts",
              "apps/web/test/native-rate-provider.boundary.test.ts",
            ],
            module: "cloudflare:workers",
          },
          // The private API binding is adapted once, by the Website host.
          {
            allowTypes: true,
            allowedFiles: [
              "apps/web/src/lib/host/binding.adapter.layer.ts",
              "apps/web/test/native-rate.boundary.test.ts",
            ],
            module: "@alchemy.run/cloudflare/Bridge",
          },
        ],
      },
    ],
    // The Cloudflare cache belongs to native Alchemy Worker/Website caching.

    "strict-effect/no-loader-request-state": [
      "error",
      {
        clientServices: [{ module: "./api-client.atoms", name: "ApiClient" }],
        loaderFiles: [
          "apps/web/src/lib/pages/loaders.ts",
          "apps/web/src/lib/runtime.client.ts",
          "apps/web/src/lib/runtime.server.ts",
        ],
      },
    ],

    "strict-effect/runtime-file-convention": "error",

    // Browser reads call the API directly; the Website has no proxy at the
    // API's public paths.
    "strict-effect/website-data-proxy": [
      "error",
      {
        publicApiPaths: ["/api", "/mcp"],
        websiteDirectory: "apps/web/src",
      },
    ],
    "taxkit-package/workspace-roles": "error",
    "typescript/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "never",
      },
    ],

    // Effect Array supports data-first calls like Array.filter(items, predicate);
    // this Unicorn rule misreads that second argument as a native Array thisArg.
  },
});
