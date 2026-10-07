import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import { BunServices } from "@effect/platform-bun";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem } from "effect";

import { lintFiles } from "./cli-fixture.js";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const { dirname, join } = nodePath;
const encoder =
  'import { Schema } from "effect";\n\nexport const result = Schema.encodeEffect(Schema.String)("fixture");';
const decoder =
  'import { Schema } from "effect";\n\nexport const result = Schema.decodeUnknownEffect(Schema.String)("fixture");';

// An isolated config root keeps the exact production relative paths. Never
// replace or delete the real owner to exercise its file-specific permission.
it.effect.each([
  {
    allowed: true,
    path: "apps/web/src/lib/analytics/relay/relay.adapter.layer.ts",
    rule: "",
    source: decoder,
  },
  {
    allowed: false,
    path: "apps/web/src/lib/analytics/relay/adjacent.layer.ts",
    rule: "no-decoding-outside-boundaries",
    source: decoder,
  },
  {
    allowed: false,
    path: "apps/web/src/lib/analytics/relay/relay.adapter.layer.ts",
    rule: "no-restricted-globals",
    source: 'export const result = fetch("https://invalid.example");',
  },
  {
    allowed: false,
    path: "apps/web/src/lib/analytics/relay/relay.adapter.layer.ts",
    rule: "no-runtime-execution-outside-boundaries",
    source:
      'import { Effect } from "effect"; export const result = Effect.runPromise(Effect.void);',
  },
  {
    allowed: true,
    path: "packages/infrastructure/src/posthog/management.adapter.layer.ts",
    rule: "",
    source: decoder,
  },
  {
    allowed: false,
    path: "packages/infrastructure/src/posthog/management.adapter.layer.ts",
    rule: "no-schema-encoder-outside-egress",
    source: encoder,
  },
  {
    allowed: false,
    path: "packages/infrastructure/src/posthog/management.adapter.layer.ts",
    rule: "no-runtime-execution-outside-boundaries",
    source:
      'import { Effect } from "effect"; export const result = Effect.runPromise(Effect.void);',
  },
  {
    allowed: false,
    path: "packages/infrastructure/src/posthog/management.adapter.layer.ts",
    rule: "no-restricted-globals",
    source: 'export const result = fetch("https://invalid.example");',
  },
  {
    allowed: true,
    path: "packages/infrastructure/src/posthog/management.adapter.layer.ts",
    rule: "",
    source:
      'export { getOrganizationsProject as result } from "@distilled.cloud/posthog/organizations";',
  },
  {
    allowed: false,
    path: "packages/infrastructure/src/posthog/projects.provider.ts",
    rule: "no-restricted-imports",
    source:
      'export { getOrganizationsProject as result } from "@distilled.cloud/posthog/organizations";',
  },
  {
    allowed: false,
    path: "apps/api/src/posthog-adjacent.ts",
    rule: "no-restricted-imports",
    source:
      'export { getOrganizationsProject } from "@distilled.cloud/posthog/organizations";',
  },
  {
    allowed: false,
    path: "apps/api/src/posthog-adjacent.ts",
    rule: "no-restricted-imports",
    source:
      'export const result = import("@distilled.cloud/posthog/organizations");',
  },
  {
    allowed: false,
    path: "packages/infrastructure/src/posthog/management.adjacent.ts",
    rule: "no-decoding-outside-boundaries",
    source: decoder,
  },
  {
    allowed: true,
    path: "packages/infrastructure/src/posthog/management.boundary.test.ts",
    rule: "",
    source: decoder,
  },
  {
    allowed: true,
    path: "packages/infrastructure/src/posthog/management.boundary.test.ts",
    rule: "",
    source: encoder,
  },
  {
    allowed: false,
    path: "packages/infrastructure/src/posthog/management.boundary.test.ts",
    rule: "no-restricted-imports",
    source:
      'export { getOrganizationsProject as result } from "@distilled.cloud/posthog/organizations";',
  },
  {
    allowed: true,
    path: "packages/analytics/src/live.layer.ts",
    rule: "",
    source: encoder,
  },
  {
    allowed: false,
    path: "packages/analytics/src/live.layer.ts",
    rule: "no-decoding-outside-boundaries",
    source: decoder,
  },
  {
    allowed: false,
    path: "packages/analytics/src/live.layer.ts",
    rule: "no-runtime-execution-outside-boundaries",
    source:
      'import { Effect } from "effect"; export const result = Effect.runPromise(Effect.void);',
  },
  {
    allowed: false,
    path: "packages/analytics/src/adjacent.ts",
    rule: "no-schema-encoder-outside-egress",
    source: encoder,
  },
  {
    allowed: true,
    path: "packages/analytics/src/__testing__/fixtures.ts",
    rule: "",
    source: decoder,
  },
  {
    allowed: false,
    path: "packages/analytics/src/__testing__/fixtures.ts",
    rule: "no-schema-encoder-outside-egress",
    source: encoder,
  },
  {
    allowed: true,
    path: "packages/analytics/src/collection-policy.boundary.ts",
    rule: "",
    source: decoder,
  },
  {
    allowed: false,
    path: "apps/api/src/analytics-request.boundary.ts",
    rule: "no-schema-encoder-outside-egress",
    source: encoder,
  },
  {
    allowed: false,
    path: "apps/api/src/analytics-request.boundary.ts",
    rule: "no-restricted-globals",
    source: 'export const result = fetch("https://invalid.example");',
  },
  {
    allowed: false,
    path: "apps/api/src/analytics-adjacent.ts",
    rule: "no-decoding-outside-boundaries",
    source: decoder,
  },
  {
    allowed: true,
    path: "apps/web/src/lib/calculator-policy.browser.layer.ts",
    rule: "",
    source: decoder,
  },
  {
    allowed: false,
    path: "apps/web/src/lib/calculator-policy.browser.layer.ts",
    rule: "no-schema-encoder-outside-egress",
    source: encoder,
  },
  {
    allowed: false,
    path: "apps/web/src/lib/calculator-policy.browser.layer.ts",
    rule: "no-runtime-execution-outside-boundaries",
    source:
      'import { Effect } from "effect"; export const result = Effect.runPromise(Effect.void);',
  },
  {
    allowed: false,
    path: "apps/web/src/lib/calculator-policy.browser.layer.ts",
    rule: "no-restricted-globals",
    source: 'export const result = fetch("https://invalid.example");',
  },
  {
    allowed: false,
    path: "apps/web/src/lib/calculator-policy.browser.adjacent.ts",
    rule: "no-decoding-outside-boundaries",
    source: decoder,
  },
  {
    allowed: false,
    path: "packages/analytics/src/collection-policy.boundary.ts",
    rule: "no-schema-encoder-outside-egress",
    source: encoder,
  },
  {
    allowed: false,
    path: "apps/api/src/analytics-request.boundary.ts",
    rule: "no-decoding-outside-boundaries",
    source: decoder,
  },
  {
    allowed: false,
    path: "apps/web/test/native-analytics.boundary.test.ts",
    rule: "no-object-writes",
    source:
      'export const result = Object.defineProperty({}, "ordinary", { value: true });',
  },
  {
    allowed: false,
    path: "apps/web/test/native-analytics.boundary.test.ts",
    rule: "no-native-work",
    source: 'export const result = () => { throw new Error("ordinary"); };',
  },
  {
    allowed: false,
    path: "apps/web/test/native-analytics.boundary.test.ts",
    rule: "no-promise-workflow",
    source:
      'export const result = async () => await Promise.resolve("ordinary");',
  },
  {
    allowed: true,
    path: "apps/web/test/native-analytics.boundary.test.ts",
    rule: "",
    source: decoder,
  },
  {
    allowed: true,
    path: "apps/web/test/native-analytics.boundary.test.ts",
    rule: "",
    source: encoder,
  },
  {
    allowed: false,
    path: "apps/web/test/native-analytics.boundary.test.ts",
    rule: "no-runtime-execution-outside-boundaries",
    source:
      'import { Effect } from "effect"; export const result = Effect.runPromise(Effect.void);',
  },
  {
    allowed: false,
    path: "apps/web/test/native-analytics-adjacent.test.ts",
    rule: "no-decoding-outside-boundaries",
    source: decoder,
  },
  {
    allowed: true,
    path: "apps/web/test/native-analytics.boundary.test.ts",
    rule: "",
    source:
      'import { Schema } from "effect";\n\nexport class NativeAnalyticsClientFailed extends Schema.TaggedError<NativeAnalyticsClientFailed>()("NativeAnalyticsClientFailed", { operation: Schema.Literal("connect") }) {}',
  },
  {
    allowed: false,
    path: "apps/web/test/native-analytics.boundary.test.ts",
    rule: "error-constructor-new",
    source: 'export const failure = Error("fixture");',
  },
])(
  "the actual lint command keeps the analytics permission narrow at $path ($allowed)",
  ({ path, source, allowed, rule }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const temp = yield* fs.makeTempDirectoryScoped({
        prefix: "taxkit-analytics-lint-",
      });
      const config = join(temp, "oxlint.config.ts");
      yield* fs.copyFile(join(repositoryRoot, "oxlint.config.ts"), config);
      yield* fs.symlink(
        join(repositoryRoot, "node_modules"),
        join(temp, "node_modules")
      );
      yield* fs.symlink(join(repositoryRoot, "tools"), join(temp, "tools"));
      yield* fs.symlink(join(repositoryRoot, ".agents"), join(temp, ".agents"));
      const target = join(temp, path);
      yield* fs.makeDirectory(dirname(target), { recursive: true });
      yield* fs.writeFileString(target, source);
      const result = yield* lintFiles([target], [], "unix", config);
      expect(result.exitCode, result.output).toBe(allowed ? 0 : 1);
      if (!allowed) {
        expect(result.output).toContain(rule);
      }
    }).pipe(Effect.provide(BunServices.layer))
);
