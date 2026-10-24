import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it } from "@effect/vitest";
import { Array, Effect, FileSystem, Schema } from "effect";

import { lintFiles, writeLintFixture } from "./cli-fixture.js";

const Report = Schema.fromJsonString(
  Schema.Struct({
    diagnostics: Schema.Array(Schema.Struct({ code: Schema.String })),
    number_of_files: Schema.Int,
  })
);
const lint = (file: string) =>
  lintFiles([file], [], "json").pipe(
    Effect.flatMap((result) =>
      Schema.decodeEffect(Report)(result.stdout).pipe(
        Effect.map((report) => ({ ...result, report }))
      )
    )
  );
const rejected = (file: string, source: string, code: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      yield* writeLintFixture(file, source);
      const result = yield* lint(file);
      expect(result.exitCode, `${file}: ${source}\n${result.output}`).toBe(1);
      expect(result.report.number_of_files).toBe(1);
      expect(
        Array.map(result.report.diagnostics, (entry) => entry.code)
      ).toContain(code);
    })
  );

it.effect(
  "rejects unavailable exports, undeclared edges and backend roles through native Oxlint",
  () =>
    Effect.gen(function* () {
      const browser = "apps/web/src/.generated-workspace-role.ts";
      const packageSource = "packages/core/src/.generated-workspace-role.ts";
      yield* Effect.forEach(
        [
          [
            browser,
            'import "@taxkit/content/not-exported";',
            "package(workspace-import-boundaries)",
          ],
          [
            browser,
            'import "@taxkit/api-mcp/server";',
            "taxkit-package(workspace-roles)",
          ],
          [
            browser,
            'export * from "@taxkit/content/live";',
            "taxkit-package(workspace-roles)",
          ],
          [
            browser,
            'export const load = () => import("@taxkit/api-http/handlers");',
            "taxkit-package(workspace-roles)",
          ],
          [
            browser,
            `const owner = "@taxkit/api-mcp"; export const load = () => import(\`\${owner}/server\`);`,
            "taxkit-package(workspace-roles)",
          ],
          [
            browser,
            'export type Backend = import("@taxkit/api-mcp/server");',
            "taxkit-package(workspace-roles)",
          ],
          [
            browser,
            'import "../../../packages/content/src/service.ts";',
            "package(workspace-import-boundaries)",
          ],
          [
            browser,
            'import "#/../../../packages/content/src/service.ts";',
            "package(workspace-import-boundaries)",
          ],
          [
            browser,
            'import "./lib/runtime.server";',
            "taxkit-package(workspace-roles)",
          ],
          [
            browser,
            'import "alchemy/Runtime";',
            "taxkit-package(workspace-roles)",
          ],
          [
            packageSource,
            'import "@taxkit/content/schemas";',
            "package(workspace-import-boundaries)",
          ],
          [
            packageSource,
            'import "api/worker";',
            "package(workspace-import-boundaries)",
          ],
          [
            packageSource,
            'import "@distilled.cloud/cloudflare";',
            "taxkit-package(workspace-roles)",
          ],
          [
            "packages/observability/src/.generated-workspace-role.ts",
            'import "@taxkit/calculators/admission.schemas";',
            "taxkit-package(workspace-roles)",
          ],
          [
            "packages/observability/src/.generated-workspace-role.ts",
            'import "taxkit/core";',
            "taxkit-package(workspace-roles)",
          ],
          [browser, 'import "taxkit/au";', "taxkit-package(workspace-roles)"],
        ] as const,
        ([file, source, code]) => rejected(file, source, code),
        { concurrency: 1, discard: true }
      );
      yield* writeLintFixture(
        browser,
        `import "@taxkit/content/schemas";
import "@taxkit/api-http/api";
import "@taxkit/calculators/summaries";
`
      );
      const accepted = yield* lint(browser);
      expect(accepted.exitCode, accepted.output).toBe(0);
      expect(accepted.report.diagnostics).toEqual([]);
      // Real approved host paths continue to use Alchemy runtime helpers and
      // exact infrastructure type exports. A neighbouring file gains no grant.
      const host = yield* lintFiles([
        "apps/web/src/lib/host/config.ingress.ts",
        "apps/web/src/lib/host/binding.adapter.layer.ts",
        "apps/api/src/worker.ts",
      ]);
      expect(host.exitCode, host.output).toBe(0);
      yield* rejected(
        "apps/web/src/lib/.generated-host-neighbour.server.ts",
        'import "@taxkit/infrastructure/api-worker";',
        "taxkit-package(workspace-roles)"
      );
      // Only a module marked server-only may import Alchemy.
      yield* rejected(
        "apps/web/src/lib/.generated-unmarked-host.ts",
        'import "alchemy/Runtime";',
        "taxkit-package(workspace-roles)"
      );
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
  120_000
);

it.effect(
  "admits exact native isomorphic and server host imports while browser neighbours stay strict",
  () =>
    Effect.gen(function* () {
      const host = yield* lintFiles([
        "apps/web/src/lib/pages/loaders.ts",
        "apps/web/src/lib/host/settings.layer.ts",
        "apps/web/src/lib/http/negotiation.ingress.ts",
      ]);
      expect(host.exitCode, host.output).toBe(0);
      yield* Effect.forEach(
        [
          "./runtime.server",
          "./other.server",
          "./other.server.layer",
          "#/lib/runtime.server",
          "./runtime.server?raw",
        ],
        (address) =>
          rejected(
            "apps/web/src/lib/.generated-native-host-neighbour.ts",
            `import "${address}";`,
            "taxkit-package(workspace-roles)"
          ),
        { concurrency: 1, discard: true }
      );
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
  60_000
);

it.effect(
  "reads fresh nested manifest exports, wildcard fences and every dependency class",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const directory = "packages/api/workspace-boundary-fixture";
      yield* Effect.acquireRelease(fs.makeDirectory(directory), () =>
        fs.remove(directory, { recursive: true }).pipe(Effect.orDie)
      );
      const manifest = `${directory}/package.json`;
      const file = `${directory}/.generated-workspace.ts`;
      yield* fs.writeFileString(
        manifest,
        `{
  "name": "@taxkit/workspace-boundary-fixture",
  "peerDependencies": {"@taxkit/content": "workspace:*"},
  "exports": {
    "./conditional": {"source": "./src/source.ts", "default": null},
    "./array": [null, "./src/fallback.ts"],
    "./features/*": "./src/*.ts",
    "./features/private/*": null,
    "./blocked": {"source": null, "default": "./src/fallback.ts"}
  }
}`
      );
      yield* writeLintFixture(
        file,
        `import "@taxkit/workspace-boundary-fixture/conditional";
import "@taxkit/workspace-boundary-fixture/array";
import "@taxkit/workspace-boundary-fixture/features/public";
import "@taxkit/content/schemas";
`
      );
      const accepted = yield* lint(file);
      expect(accepted.exitCode, accepted.output).toBe(0);
      expect(accepted.report.diagnostics).toEqual([]);
      yield* Effect.forEach(
        ["blocked", "features/private/secret", "missing"],
        (subpath) =>
          rejected(
            file,
            `import "@taxkit/workspace-boundary-fixture/${subpath}";`,
            "package(workspace-import-boundaries)"
          ),
        { concurrency: 1, discard: true }
      );
      // A role-approved import still fails after its manifest export disappears.
      const contentManifest = "packages/content/package.json";
      const original = yield* fs.readFileString(contentManifest);
      yield* Effect.acquireUseRelease(
        fs.writeFileString(
          contentManifest,
          '{"name":"@taxkit/content","exports":{"./schemas":null}}'
        ),
        () =>
          rejected(
            "apps/web/src/.generated-workspace-role.ts",
            'import "@taxkit/content/schemas";',
            "package(workspace-import-boundaries)"
          ),
        () => fs.writeFileString(contentManifest, original).pipe(Effect.orDie)
      );
      yield* Effect.forEach(
        [
          "dependencies",
          "devDependencies",
          "optionalDependencies",
          "peerDependencies",
        ],
        (field) =>
          Effect.gen(function* () {
            yield* fs.writeFileString(
              manifest,
              `{"name":"@taxkit/workspace-boundary-fixture","${field}":{"@taxkit/content":"workspace:*"}}`
            );
            yield* writeLintFixture(file, 'import "@taxkit/content/schemas";');
            const result = yield* lint(file);
            expect(result.exitCode, result.output).toBe(0);
          }),
        { concurrency: 1, discard: true }
      );
      yield* fs.writeFileString(
        manifest,
        '{"name":"@taxkit/workspace-boundary-fixture"}'
      );
      yield* rejected(
        file,
        'import "@taxkit/content/schemas";',
        "package(workspace-import-boundaries)"
      );
      yield* fs.writeFileString(manifest, '{"name":42}');
      const invalid = yield* lintFiles([file]);
      expect(invalid.exitCode).not.toBe(0);
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
  120_000
);
