import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import remix from "ultracite/oxlint/remix";

const taxkitReact = defineConfig({
  ...react,
  rules: {
    ...react.rules,
    // Effect Match and Result callbacks return JSX inline but do not define
    // stateful React components. Keep the rule for actual nested components.
    "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
  },
});

const decodingBoundaryFiles = [
  // Exact imported navigation ingress at the synchronous Fumadocs config host.
  // No synchronous throwing codec, encoder or runtime execution admission.
  "packages/docs-content/source.config.ts",
  // Exact acceptance JSON, external example JSON and raw HTTP error ingress.
  "tools/documentation/catalogue.build.ts",
  "tools/documentation/catalogue.build.test.ts",
  "packages/docs-examples/src/validate-external-input.ts",
  "packages/docs-examples/src/api-error-envelope.ts",
  "packages/docs-examples/test/integration.example.test.ts",
  // Exact public catalogue wire and adversarial ingress fixtures only.
  "packages/content/src/__testing__/fixtures.ts",
  "packages/content/test/schemas.test.ts",
  "packages/content/test/service.test.ts",
  // Exact native connection, private-call and provider-reply trust boundaries.
  // No encoder, runner, cast, mutation or neighbouring-path permission.
  "packages/api/rpc/src/rate-identity.boundary.ts",
  "apps/api/src/worker.application.ts",
  "apps/api/src/worker-admission.layer.ts",
  "apps/web/src/lib/live.server.layer.ts",
  // Exact native rate wire/provider fixtures and redacted-key codec checks.
  "apps/api/test/rate-admission.boundary.test.ts",
  "apps/api/test/worker-admission.boundary.test.ts",
  "packages/calculators/__tests__/calculation-admission.test.ts",
  // Exact encoded date representation ingress and historical round-trip test.
  // No runtime, raw JSON or synchronous codec admission.
  "packages/core/src/primitives/date.ts",
  "packages/core/test/date.test.ts",
  // Historical trace and question representation round trips only.
  "packages/core/test/domain-absence.boundary.test.ts",
  // Native app root stage ingress, checked before constructing secret Layers.
  "packages/infrastructure/src/apps-secrets.boundary.ts",
  "apps/web/test/native-rpc-failures.boundary.test.ts",
  "apps/web/test/native-cancellation.boundary.test.ts",
  "apps/web/test/native-local-development.boundary.test.ts",
  // Native RPC parser unknown envelopes and exact adversarial transport fixtures.
  "packages/api/rpc/src/server-serialization.boundary.ts",
  "packages/api/rpc/src/client-response.boundary.ts",
  "packages/api/rpc/src/content-client-response.boundary.ts",
  "packages/api/rpc/test/handlers.test.ts",
  "packages/api/rpc/test/deadline.test.ts",
  "packages/api/rpc/test/content.fixture.ts",
  "packages/api/rpc/test/content.boundary.test.ts",
  "packages/api/rpc/test/content-deadline.boundary.test.ts",
  // Exact native website settings, form and hydration boundaries.
  "apps/web/src/lib/config.boundary.test.ts",
  "apps/web/src/lib/config.server.ts",
  // Native documentation loader ingress: checked public header or SSR address.
  "apps/web/src/lib/loaders.server.ts",
  "apps/web/src/lib/docs/mdx.boundary.tsx",
  "apps/web/src/lib/docs/route-boundary.ts",
  "apps/web/src/lib/docs/search-location.boundary.ts",
  "apps/web/src/lib/calculator.boundary.browser.test.tsx",
  "apps/web/src/lib/health-loader.boundary.browser.test.tsx",
  "apps/web/src/lib/form.boundary.ts",
  "apps/web/src/routes/__root.tsx",
  "apps/web/src/server.ts",
  "apps/api/scripts/routes.ts",
  "apps/api/test/config.test.ts",
  "packages/sdk/typescript/scripts/script-boundaries.test.ts",
  // Exact synthetic register fixture ingress; no command execution admission.
  "tools/docs-deployment/automation.check.runtime.test.ts",
  "tools/docs-deployment/local-doppler-environment.boundary.ts",
  "tools/docs-deployment/fixtures/fake-doppler.runtime.ts",
  // Exact synchronous Oxlint rule-options ingress, decoded once and fail-closed.
  "tools/oxlint/taxkit-rules.ts",
  // Exact fixture ingress: three Schema-owned historical policy corpora.
  "tools/skills/skill-policies.test.ts",
  // Application configuration, executable smoke checks and checked examples.
  "apps/api/src/config.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "packages/docs-examples/src/browser-http.ts",
  "packages/docs-examples/src/node-server.ts",
  "apps/docs/src/lib/docs/loaders.ts",
  "apps/docs/src/lib/docs/loaders.server.ts",
  "apps/docs/src/lib/docs/route-boundary.ts",
  "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
  "apps/docs/scripts/cloudflare-built-browser.live.ts",
  "apps/docs/scripts/cloudflare-built-browser.live.test.ts",
  "apps/docs/scripts/cloudflare-built-proof.boundary.test.ts",
  "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
  "apps/docs/scripts/cloudflare-hosted-proof.live.layer.ts",
  "apps/docs/scripts/cloudflare-hosted-proof.boundary.test.ts",
  "apps/docs/scripts/cloudflare-hosted-proof.live.layer.test.ts",
  "apps/docs/scripts/test-cloudflare-hosted.propagation.test.ts",
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

  // Native built request egress and standalone HTTP body tests decode only
  // actual representation responses; service internals remain excluded.
  "apps/web/test/native-pair.boundary.test.ts",
  "apps/api/test/worker.boundary.test.ts",
  "packages/api/http/__tests__/request-body.boundary.test.ts",
  "packages/api/http/__tests__/public-content.boundary.test.ts",
  "apps/api/src/content.boundary.ts",

  // Public API normalisation and focused API contract tests.
  "packages/api/http/src/openapi.ts",
  "packages/api/http/__tests__/openapi-snapshot.test.ts",
  "packages/api/http/__tests__/public-calculation-api.test.ts",

  // Focused lint integration test: CLI output is decoded at the process boundary.
  "tools/oxlint/cli-fixture.ts",
  "tools/oxlint/no-decoding-outside-boundaries.test.ts",
  "tools/oxlint/portable-rules.test.ts",
  "tools/oxlint/lexical-policy.test.ts",
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
  "tools/docs-deployment/automation.policy.test.ts",
  "tools/docs-deployment/inventory.service.test.ts",
  // Synthetic report ingress for the inventory caller and output boundary.
  "tools/docs-deployment/inventory.runtime.test.ts",
  "tools/docs-deployment/inventory.live.layer.ts",
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
  // Exact child-process UTF-8 output boundary; no runtime admission.
  "tools/evals/hgi-206/check.runtime.test.ts",
  "tools/evals/harness-foundation/input.boundary.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/governance/foundation.test.ts",
  "tools/governance/input.boundary.ts",
  "tools/governance/policy.test.ts",

  // Heterogeneous catalogue dispatch and public unknown-input scenario boundaries.
  "packages/calculators/src/catalog.ts",
  "packages/calculators/src/errors.ts",
  "packages/rules/au/income-tax/src/calculator/annual-tax.boundary.ts",
  "packages/rules/au/pay/src/calculator/take-home-pay.boundary.ts",

  // Release-evidence decoders and their adversarial boundary fixtures.
  "packages/scripts/src/release-readiness/cli.test.ts",
  "packages/scripts/src/release-readiness/evidence.boundary.test.ts",
  "packages/scripts/src/release-readiness/evidence.boundary.ts",
  "packages/scripts/src/release-readiness/cli.ts",
  "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  // Cross-process command output restored by the release-readiness live layer.
  "packages/scripts/src/release-readiness/live.layer.ts",

  // SDK rejected Promise ingress and descriptor/process boundaries.
  "packages/sdk/typescript/src/index.test.ts",
  // Selected domain-report Type versus encoded representation regression test.
  "packages/sdk/typescript/src/effect.test.ts",
  "packages/sdk/typescript/src/client-lifetime.test.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/src/effect.ts",
  "packages/sdk/typescript/src/types.ts",
];

const routeTransportBoundaryModules = ["#/lib/docs/route-boundary"];

const routeTransportConsumerFiles = [
  "apps/web/src/routes/$.tsx",
  "apps/web/src/routes/search.tsx",
  "apps/docs/src/routes/$.tsx",
  "apps/docs/src/routes/index.tsx",
  "tools/oxlint/fixtures/route-transport-allowed.tsx",
  "tools/oxlint/fixtures/.generated-route-transport-consumer.tsx",
];

const effectContractFiles = [
  "apps/**/{config,errors,schema,schemas,service,services}.ts",
  "packages/**/{config,errors,schema,schemas,service,services}.ts",
  "packages/api/rpc/src/content.{errors,schemas,service}.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
  "tools/oxlint/fixtures/.generated-effect-rejected.ts",
];

const effectServiceContractFiles = [
  "apps/**/{service,services}.ts",
  "packages/**/{service,services}.ts",
  "packages/api/rpc/src/content.service.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
  "tools/oxlint/fixtures/.generated-effect-rejected.ts",
];

const effectErrorContractFiles = [
  "apps/**/{errors,schema,schemas}.ts",
  "packages/**/{errors,schema,schemas}.ts",
  "packages/api/rpc/src/content.errors.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/oxlint/fixtures/effect-unrelated-accepted.ts",
  "tools/oxlint/fixtures/.generated-effect-rejected.ts",
];

// Inline Promise rejection mapping applies to every owned source extension.
const portableEffectSourceFiles = ["**/*.{cjs,mjs,jsx,js,tsx,ts}"];

const schemaEncoderEgressFiles = [
  "tools/documentation/catalogue.build.ts",
  "tools/documentation/catalogue.build.test.ts",
  // Exact public catalogue representation round-trip proof, not a service encoder.
  "packages/content/test/schemas.test.ts",
  // Exact rate wire/secret-negative fixtures; no production encoding permission.
  "apps/api/test/rate-admission.boundary.test.ts",
  "apps/api/test/worker-admission.boundary.test.ts",
  "apps/web/test/native-rate.boundary.test.ts",
  "apps/web/test/native-rate-provider.boundary.test.ts",
  "packages/calculators/__tests__/calculation-admission.test.ts",
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
  "packages/core/test/money.test.ts",
  "apps/web/test/native-rpc-failures.boundary.test.ts",
  "apps/web/test/native-cancellation.boundary.test.ts",
  "apps/web/test/native-settings-failure.boundary.test.ts",
  "apps/web/test/native-pair.boundary.test.ts",
  "apps/api/test/worker.boundary.test.ts",
  // Test-only native request/reply bytes; no production encoder admission.
  "packages/api/rpc/test/handlers.test.ts",
  "packages/api/rpc/test/content.boundary.test.ts",
  "apps/docs/scripts/test-cloudflare-built.tsx",
  "apps/docs/scripts/cloudflare-built-proof.live.layer.ts",
  "apps/docs/scripts/cloudflare-built-proof.boundary.test.ts",
  "apps/web/src/lib/calculator.boundary.browser.test.tsx",
  "apps/web/src/lib/loaders.server.ts",
  // Native public search header and checked local input-error transport egress.
  "apps/web/src/lib/loaders.ts",
  "apps/web/src/server.ts",
  "apps/web/src/lib/health-loader.boundary.browser.test.tsx",
  "apps/web/src/lib/config.boundary.test.ts",
  // Exact negative wire fixtures; native encoding only, no decoder/runtime/throwing codec admission.
  "apps/docs/src/lib/docs/route-boundary.test.ts",
  "apps/api/scripts/smoke-boundaries.test.ts",
  "apps/api/test/config.test.ts",
  "packages/sdk/typescript/scripts/script-boundaries.test.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  // Plain Promise rejection and calculator error representations: secret-negative tests only.
  "packages/sdk/typescript/src/index.test.ts",
  "packages/sdk/typescript/src/effect.test.ts",
  "packages/sdk/typescript/src/client-lifetime.test.ts",
  "packages/scripts/src/release-readiness/evidence.boundary.test.ts",
  "packages/scripts/src/release-readiness/live.layer.test.ts",
  "tools/docs-deployment/inventory.report.egress.ts",
  // Canonical JSON bytes used only to bind immutable saved-record fingerprints.
  "tools/docs-deployment/retained-record.egress.ts",
  "tools/docs-deployment/automation.check.runtime.test.ts",
  // Exact saved-plan JSON and synthetic provider fixture representations.
  "tools/docs-deployment/workflow-plan-projection.ts",
  "tools/docs-deployment/workflow-evidence.test.ts",
  // Exact credential/YAML/receipt negative-fixture representations only.
  "tools/docs-deployment/doppler-custody.test.ts",
  "tools/docs-deployment/inventory-credentials.boundary.test.ts",
  "tools/docs-deployment/workflow-check.boundary.test.ts",
  "tools/docs-deployment/fixtures/fake-doppler.runtime.ts",
  "packages/docs-content/src/service.test.ts",
  "packages/docs-content/src/generated-page.boundary.test.ts",
  "packages/docs-fumadocs/src/service.test.ts",
  "packages/docs-examples/src/node-server.ts",
  "tools/governance/check.runtime.ts",
  // Exact historical skill representation test uses the Candidate-owned Schema.
  "tools/evals/hgi-206/service.test.ts",
  "packages/api/http/__tests__/openapi-snapshot.test.ts",
  "packages/api/http/__tests__/public-calculation-api.test.ts",
  // Exact representation-boundary tests: deterministic report bytes and secret-negative error JSON.
  "packages/rules/au/pay/test/take-home-pay.test.ts",
  "packages/calculators/__tests__/public-calculator-service.test.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/docs/src/server.ts",
  "apps/docs/src/lib/docs/route-boundary.ts",
  "apps/docs/src/lib/docs/loaders.server.ts",
  "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
  "apps/docs/scripts/cloudflare-hosted-proof.boundary.test.ts",
  "apps/docs/scripts/test-cloudflare-hosted.propagation.test.ts",
  "packages/scripts/src/release-readiness/evidence.boundary.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  // Exact acceptance-record and command-fixture representation tests.
  "tools/documentation/policy.test.ts",
  "tools/documentation/check.runtime.test.ts",
  "tools/documentation/runbook-check.runtime.test.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/workflow-evidence.ts",
];

const throwingCodecTestFiles = [
  "tools/docs-deployment/doppler-custody.test.ts",
  "tools/docs-deployment/inventory-credentials.boundary.test.ts",
  "tools/docs-deployment/workflow-check.boundary.test.ts",

  // Pure policy fixtures encode their Schema-owned accepted record bytes.
  "tools/documentation/policy.test.ts",
  "packages/docs-content/src/validation/policy.runtime.test.ts",
  "tools/docs-deployment/workflow-plan-projection.test.ts",
];

const runtimeBoundaryFiles = [
  "packages/docs-content/src/catalogue-index.runtime.ts",
  "tools/documentation/catalogue.runtime.ts",
  "apps/web/scripts/native-pair-build.runtime.ts",
  "apps/docs/scripts/check-import-boundaries.runtime.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
  "packages/sdk/typescript/src/client.runtime.ts",
  "tools/docs-deployment/fixtures/fake-doppler.runtime.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/api/src/index.ts",
  "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
  "apps/docs/src/lib/runtime-factory.server.ts",
  "apps/docs/src/lib/runtime.server.ts",
  "apps/docs/src/server.ts",
  "apps/docs/scripts/test-cloudflare-built.tsx",
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "apps/docs/vite.config.ts",
  "apps/web/vite.config.ts",
  "apps/web/src/lib/runtime.server.ts",
  "apps/web/src/lib/loaders.ts",
  "apps/web/src/lib/health-loader.boundary.browser.test.tsx",
  "apps/web/src/lib/loaders.server.ts",
  "apps/web/src/server.ts",
  "packages/docs-content/src/validate.runtime.ts",
  "packages/scripts/src/release-readiness/present.runtime.ts",
  "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
  "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
  "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
  "tools/oxlint/fixtures/bun-accepted.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/repository-paths/check.runtime.test.ts",
  "tools/repository-paths/check.runtime.ts",
  "tools/quality-workflow/check.runtime.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/evals/hgi-206/check.runtime.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/governance/check.runtime.ts",
  "tools/governance/policy.test.ts",
  "tools/docs-deployment/check.runtime.ts",
  "tools/docs-deployment/automation.check.runtime.ts",
  "tools/docs-deployment/doppler-custody.runtime.ts",
  "tools/docs-deployment/inventory.runtime.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/workflow-artifact.runtime.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "tools/docs-deployment/workflow-plan-projection.runtime.ts",
  "tools/docs-deployment/workflow-proof-check.runtime.ts",
  "tools/docs-deployment/workflow-input-check.runtime.ts",
  "tools/docs-deployment/workflow-run-check.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
  "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
];

const processBoundaryFiles = [
  "tools/docs-deployment/fixtures/fake-doppler.runtime.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "apps/docs/vitest.browser.config.ts",
  "tools/oxlint/fixtures/effect-accepted.ts",
  "tools/documentation/check.runtime.ts",
  "tools/documentation/runbook-check.runtime.ts",
  "tools/evals/hgi-206/check.runtime.ts",
  "tools/evals/harness-foundation/check.runtime.ts",
  "tools/governance/check.runtime.ts",
  "tools/docs-deployment/automation.check.runtime.ts",
  "tools/docs-deployment/local-doppler.runtime.ts",
  "tools/docs-deployment/local-doppler.test.ts",
  "tools/docs-deployment/workflow-evidence.runtime.ts",
  "tools/docs-deployment/workflow-input-check.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
];

const consoleBoundaryFiles = [
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "packages/docs-content/src/validate.runtime.ts",
  "packages/scripts/src/release-readiness/present.runtime.ts",
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
  "apps/docs/scripts/test-cloudflare-hosted.tsx",
  "tools/oxlint/fixtures/bun-accepted.ts",
  "tools/governance/check.runtime.ts",
  "tools/docs-deployment/workflow-plan-check.runtime.ts",
];

const bunRuntimeEntrypointFiles = [
  "packages/docs-content/src/catalogue-index.runtime.ts",
  "tools/documentation/catalogue.runtime.ts",
  "apps/web/scripts/native-pair-build.runtime.ts",
  "apps/docs/scripts/check-import-boundaries.runtime.ts",
  "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
  "tools/docs-deployment/fixtures/fake-doppler.runtime.ts",
  "apps/api/scripts/smoke-public-routes.runtime.ts",
  "apps/api/src/index.ts",
  "apps/docs/scripts/test-cloudflare-built.tsx",
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
    "apps/web/src/worker-runtime.generated.d.ts",
    "dist/**",
    ".output/**",
    ".tanstack/**",
    ".turbo/**",
    ".vercel/**",
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [
    {
      name: "strict-effect",
      specifier:
        "./.agents/skills/strict-effect-ts/assets/oxlint/effect-policy.ts",
    },
    "./tools/oxlint/bun-rules.ts",
    "./tools/oxlint/effect-rules.ts",
    "./tools/oxlint/mdx-rules.ts",
    "./tools/oxlint/package-rules.ts",
    "./tools/oxlint/taxkit-rules.ts",
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
      files: [
        "apps/docs/scripts/check-import-boundaries.runtime.ts",
        "apps/api/src/config.ts",
        // Schema.TaggedError is a class factory, not an Error constructor.
        "packages/api/rpc/src/live.layer.ts",
        "packages/api/rpc/src/content.live.layer.ts",
        "packages/api/rpc/src/content.errors.ts",
        "packages/api/rpc/src/response-budget.boundary.ts",
        "packages/api/rpc/src/server-serialization.boundary.ts",
        "apps/web/src/lib/config.ts",
        "apps/web/src/lib/docs/errors.ts",
        "apps/web/src/lib/form.boundary.ts",
        "apps/api/scripts/routes.ts",
        "apps/api/scripts/smoke-public-routes.runtime.ts",
      ],
      rules: { "unicorn/throw-new-error": "off" },
    },
    {
      files: [
        "packages/sdk/typescript/scripts/check-import-boundaries.runtime.ts",
        "packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts",
        "packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts",
      ],
      rules: { "unicorn/throw-new-error": "off" },
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
        "tools/oxlint/mdx-rules.ts",
        "tools/oxlint/package-rules.ts",
        "tools/oxlint/taxkit-rules.ts",
        "tools/oxlint/.generated-strict-bindings.js",
        "tools/repository-paths/**",
        "tools/governance/**",
        "tools/skills/**",
        "tools/quality-workflow/**",
        "tools/documentation/**",
        "tools/evals/**",
        "tools/docs-deployment/input.boundary.ts",
        "tools/docs-deployment/input.boundary.test.ts",
        "tools/docs-deployment/workflow-artifact*.ts",
        "tools/docs-deployment/strict-boundaries*.ts",
        "tools/docs-deployment/alchemy-memo.test.ts",
        "tools/docs-deployment/{doppler-custody*,local-doppler*,inventory-credentials*,workflow-check*,workflow-input-check*}.ts",
        "tools/docs-deployment/inventory.schemas.ts",
        "tools/docs-deployment/workflow.contract.test.ts",
        "tools/docs-deployment/workflow-plan-projection*.ts",
        "tools/docs-deployment/workflow-plan-check*.ts",
        "tools/docs-deployment/workflow-evidence*.ts",
        "tools/docs-deployment/automation*.ts",
        "tools/docs-deployment/{policy*,check.runtime*,schemas,retained-record*}.ts",
        "tools/docs-deployment/inventory*.ts",
        "tools/docs-deployment/workflow-{proof,run,teardown-proof}-check*.ts",
        "tools/docs-deployment/.generated-inventory-strict-rejected.ts",
        "tools/docs-deployment/.generated-retained-proof-strict-rejected.ts",
        "tools/docs-deployment/workflow-receipts.schemas.ts",
        "tools/docs-deployment/.generated-automation-strict-rejected.ts",
        "tools/docs-deployment/.generated-workflow-strict-rejected.ts",
        "tools/docs-deployment/fixtures/fake-doppler*.ts",
        "tools/docs-deployment/.generated-credential-strict-rejected.ts",
        "tools/docs-deployment/.generated-artifact-strict-rejected.ts",
        "packages/scripts/**",
        "packages/sdk/typescript/src/**",
        "packages/sdk/typescript/scripts/**",
        "apps/api/**",
        "packages/infrastructure/**",
        "apps/web/**",
        "packages/infrastructure/src/.generated-strict-rejected.ts",
        "apps/docs/scripts/check-import-boundaries.runtime*.ts",
        "apps/docs/scripts/cloudflare-built-*.ts",
        "apps/docs/scripts/test-cloudflare-built*.{ts,tsx}",
        "apps/docs/scripts/.generated-built-strict-rejected.ts",
        "apps/docs/scripts/cloudflare-hosted-proof*.ts",
        "apps/docs/scripts/test-cloudflare-hosted*.{ts,tsx}",
        "apps/docs/scripts/.generated-imports-strict-rejected.ts",
        "apps/docs/scripts/.generated-hosted-strict-rejected.ts",
        "apps/docs/vitest.scripts.config.ts",
        "apps/docs/vitest.server.config.ts",
        "apps/docs/vitest.browser.config.ts",
        "apps/docs/vite.config.ts",
        "apps/docs/src/**",
        "apps/docs/src/.generated-app-strict-rejected.ts",
        "apps/docs/src/lib/runtime-factory.server*.ts",
        "apps/docs/src/lib/docs/route-boundary.test.ts",
        "apps/docs/src/lib/docs/.generated-native-tests-strict-rejected.ts",
        "packages/sdk/typescript/type-tests/**",
        "packages/sdk/typescript/vitest*.config.ts",
        "packages/testing/**",
        "packages/api/http/**",
        "packages/docs-content/**",
        "packages/docs-fumadocs/**",
      ],
      rules: {
        "effect/no-runtime-references-outside-boundaries": "error",
        "strict-effect/error-constructor-new": "error",
        "strict-effect/no-imperative-collections": "error",
        "strict-effect/no-native-at": "error",
        "strict-effect/no-native-work": "error",
        "strict-effect/no-promise-workflow": "error",
        "strict-effect/no-runtime-outside-boundary": "error",
        "strict-effect/no-unchecked-index": "error",
        "strict-effect/no-unchecked-json": "error",
        "strict-effect/no-unsafe-option-unwrap": "error",
        "strict-effect/runtime-file-convention": "error",
        "strict-effect/tagged-error-name": "error",
        "taxkit/no-native-collections": "error",
        "taxkit/no-object-writes": "error",
      },
    },
    {
      files: [
        "apps/docs/scripts/cloudflare-built-proof.boundary.ts",
        "apps/docs/scripts/cloudflare-hosted-proof.boundary.ts",
      ],
      rules: { "unicorn/throw-new-error": "off" },
    },
    {
      files: ["apps/docs/scripts/test-cloudflare-built.tsx"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/docs/scripts/test-cloudflare-built.tsx"] },
        ],
      },
    },
    {
      files: ["apps/docs/scripts/test-cloudflare-hosted.tsx"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/docs/scripts/test-cloudflare-hosted.tsx"] },
        ],
      },
    },
    {
      files: ["apps/docs/scripts/check-import-boundaries.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "apps/docs/scripts/check-import-boundaries.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["apps/web/src/lib/config.server.ts"],
      rules: { "anti-slop/no-unknown-parameters": "off" },
    },
    {
      files: [
        "apps/web/src/lib/atom-lifecycle.browser.test.tsx",
        "apps/web/src/lib/calculator.boundary.browser.test.tsx",
      ],
      rules: { "unicorn/prefer-dom-node-append": "off" },
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
      files: ["apps/web/test/native-rpc-failures.boundary.test.ts"],
      rules: {
        "strict-effect/no-imperative-collections": [
          "error",
          {
            allowedMethods: [
              {
                file: "apps/web/test/native-rpc-failures.boundary.test.ts",
                method: "fill",
                receiver: "invalidPayInput",
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
      files: ["apps/web/scripts/native-pair-build.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/scripts/native-pair-build.runtime.ts"] },
        ],
      },
    },
    {
      files: ["apps/web/src/lib/loaders.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/src/lib/loaders.ts"] },
        ],
      },
    },
    {
      files: ["apps/web/src/lib/health-loader.boundary.browser.test.tsx"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "apps/web/src/lib/health-loader.boundary.browser.test.tsx",
            ],
          },
        ],
      },
    },
    {
      files: ["apps/web/src/server.ts"],
      rules: {
        "strict-effect/no-promise-workflow": [
          "error",
          { allowedFiles: ["apps/web/src/server.ts"] },
        ],
      },
    },
    {
      files: ["apps/web/src/lib/loaders.server.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/src/lib/loaders.server.ts"] },
        ],
      },
    },
    {
      files: ["apps/web/src/server.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/src/server.ts"] },
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
      files: ["apps/web/vite.config.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/web/vite.config.ts"] },
        ],
      },
    },
    {
      files: ["apps/docs/src/lib/runtime-factory.server.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/docs/src/lib/runtime-factory.server.ts"] },
        ],
      },
    },
    {
      files: ["apps/docs/src/lib/docs/loaders.server.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/docs/src/lib/docs/loaders.server.ts"] },
        ],
      },
    },
    {
      files: ["apps/docs/src/server.ts"],
      rules: {
        "strict-effect/no-promise-workflow": [
          "error",
          { allowedFiles: ["apps/docs/src/server.ts"] },
        ],
      },
    },
    {
      files: ["apps/docs/src/server.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/docs/src/server.ts"] },
        ],
      },
    },
    {
      files: ["apps/docs/vite.config.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["apps/docs/vite.config.ts"] },
        ],
      },
    },
    {
      files: ["apps/docs/src/lib/docs/route-boundary.browser.test.tsx"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "apps/docs/src/lib/docs/route-boundary.browser.test.tsx",
            ],
          },
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
      files: ["packages/sdk/typescript/src/client.runtime.ts"],
      rules: {
        "strict-effect/no-promise-workflow": [
          "error",
          { allowedFiles: ["packages/sdk/typescript/src/client.runtime.ts"] },
        ],
      },
    },
    {
      files: ["packages/scripts/src/release-readiness/present.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "packages/scripts/src/release-readiness/present.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: [
        "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
      ],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "packages/scripts/src/release-readiness/release-readiness.runtime.ts",
            ],
          },
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
      files: ["tools/quality-workflow/check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/quality-workflow/check.runtime.ts"] },
        ],
      },
    },
    {
      files: ["tools/governance/check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/governance/check.runtime.ts"] },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/doppler-custody.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: ["tools/docs-deployment/doppler-custody.runtime.ts"],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/local-doppler.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/docs-deployment/local-doppler.runtime.ts"] },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/workflow-input-check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/docs-deployment/workflow-input-check.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/fixtures/fake-doppler.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/docs-deployment/fixtures/fake-doppler.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/inventory.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/docs-deployment/inventory.runtime.ts"] },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/workflow-proof-check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/docs-deployment/workflow-proof-check.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/workflow-run-check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/docs-deployment/workflow-run-check.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/workflow-teardown-proof-check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/docs-deployment/workflow-teardown-proof-check.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/docs-deployment/check.runtime.ts"] },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/automation.check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: ["tools/docs-deployment/automation.check.runtime.ts"],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/workflow-evidence.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/docs-deployment/workflow-evidence.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/workflow-plan-projection.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/docs-deployment/workflow-plan-projection.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/workflow-plan-check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/docs-deployment/workflow-plan-check.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: ["tools/docs-deployment/workflow-artifact.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/docs-deployment/workflow-artifact.runtime.ts",
            ],
          },
        ],
      },
    },
    {
      files: [
        "tools/documentation/catalogue.runtime.ts",
        "packages/docs-content/src/catalogue-index.runtime.ts",
      ],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          {
            allowedFiles: [
              "tools/documentation/catalogue.runtime.ts",
              "packages/docs-content/src/catalogue-index.runtime.ts",
            ],
          },
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
      files: ["tools/documentation/runbook-check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/documentation/runbook-check.runtime.ts"] },
        ],
      },
    },
    {
      files: ["tools/evals/hgi-206/check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/evals/hgi-206/check.runtime.ts"] },
        ],
      },
    },
    {
      files: ["tools/evals/harness-foundation/check.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["tools/evals/harness-foundation/check.runtime.ts"] },
        ],
      },
    },
    {
      files: ["packages/docs-content/src/validate.runtime.ts"],
      rules: {
        "strict-effect/no-runtime-outside-boundary": [
          "error",
          { allowedFiles: ["packages/docs-content/src/validate.runtime.ts"] },
        ],
      },
    },
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
        "packages/sdk/typescript/src/index.test.ts",
        "packages/sdk/typescript/src/client-lifetime.test.ts",
        "packages/docs-examples/src/node-server.ts",
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
        "effect/no-runtime-references-outside-boundaries": "off",
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
    "strict-effect/error-constructor-new": "error",
    "strict-effect/no-native-at": "error",
    "strict-effect/no-unsafe-option-unwrap": "error",
    "strict-effect/runtime-file-convention": "error",
    "strict-effect/tagged-error-name": "error",
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
