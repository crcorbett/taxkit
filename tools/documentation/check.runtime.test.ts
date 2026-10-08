import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Array, Effect, Exit, FileSystem, Path, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { decodePublicPageAcceptanceRecord } from "./check.runtime.js";
import { classifyDocumentationPath } from "./policy.js";
import { DocumentationReceipt, PublicPageAcceptanceRecord } from "./schemas.js";
import type { OwnerPolicy } from "./schemas.js";

const policy = {
  fumadocs: {
    build: { owner: "docs", path: "packages/docs-content/package.json" },
    generatedRoot: "packages/docs-content/.source",
    source: { owner: "docs", path: "packages/docs-content/source.config.ts" },
  },
  maintainer: {
    rootEntrypoints: ["AGENTS.md"],
    roots: ["docs"],
    snapshotExemptions: [
      {
        documentClass: "manual-html-snapshot",
        path: "docs/repo-status-outline.html",
        reason: "snapshot",
      },
    ],
  },
  openApi: {
    liveRoute: {
      command: "test",
      owner: "api",
      path: "packages/api/http/src/server/live.layer.ts",
    },
    snapshot: {
      owner: "api",
      path: "packages/api/http/__snapshots__/openapi.json",
    },
    source: { owner: "api", path: "packages/api/http/src/openapi.ts" },
    test: {
      owner: "api",
      path: "packages/api/http/__tests__/openapi-snapshot.test.ts",
    },
  },
  public: {
    navigation: {
      owner: "public",
      path: "packages/docs-content/navigation.json",
    },
    roots: ["packages/docs-content/content"],
    statusDecision: {
      acceptanceRecords: [],
      owner: "product",
      path: "docs/documentation-audit/hgi-207/public-mdx-lifecycle.json",
      semantics: "accepted-public-lifecycle",
      statuses: {
        draft: "authored-candidate",
        published: "accepted-current",
      },
    },
  },
  sdkDocs: { owner: "sdk", roots: ["packages/sdk/typescript/README.md"] },
} satisfies OwnerPolicy;

describe("documentation checker path classes", () => {
  test.effect(
    "decodes only the strict accepted page-level record JSON contract",
    () =>
      Effect.gen(function* () {
        const valid = yield* Schema.encodeEffect(
          Schema.fromJsonString(PublicPageAcceptanceRecord)
        )({
          observedAt: "2026-07-21T22:30:00Z",
          owner: "product-owner",
          schemaVersion: 1,
          state: "accepted",
          targetPath: "packages/docs-content/content/guide.mdx",
        });
        const decoded = yield* decodePublicPageAcceptanceRecord(valid);
        expect(decoded).toEqual(
          expect.objectContaining({
            state: "accepted",
            targetPath: "packages/docs-content/content/guide.mdx",
          })
        );
        yield* Effect.forEach(
          [
            '{"state":"accepted"}',
            '{"observedAt":"not-a-timestamp","owner":"product-owner","schemaVersion":1,"state":"accepted","targetPath":"packages/docs-content/content/guide.mdx"}',
            '{"observedAt":"2026-07-21T22:30:00Z","owner":"product-owner","schemaVersion":1,"state":"draft","targetPath":"packages/docs-content/content/guide.mdx"}',
            '{"extra":true,"observedAt":"2026-07-21T22:30:00Z","owner":"product-owner","schemaVersion":1,"state":"accepted","targetPath":"packages/docs-content/content/guide.mdx"}',
          ],
          (invalid) =>
            decodePublicPageAcceptanceRecord(invalid).pipe(
              Effect.exit,
              Effect.tap((exit) =>
                Effect.sync(() => expect(Exit.isFailure(exit)).toBe(true))
              )
            )
        );
      })
  );

  test("keeps public content, maintainer docs, generated OpenAPI, and workspace manifests separate", () => {
    expect(
      classifyDocumentationPath(
        policy,
        "packages/docs-content/content/guide.mdx"
      )
    ).toBe("public");
    expect(
      classifyDocumentationPath(policy, "docs/architecture/README.md")
    ).toBe("maintainer");
    expect(
      classifyDocumentationPath(
        policy,
        "packages/api/http/__snapshots__/openapi.json"
      )
    ).toBe("generated");
    expect(
      classifyDocumentationPath(policy, "packages/docs-content/package.json")
    ).toBe("workspace-manifest");
  });
});

describe("documentation command", () => {
  test.effect.each([
    {
      args: [],
      expectedExit: 0,
      name: "prints a passing human receipt by default with zero exit",
      violation: false,
    },
    {
      args: ["--json"],
      expectedExit: 0,
      name: "prints a passing JSON receipt with zero exit",
      violation: false,
    },
    {
      args: ["--json"],
      expectedExit: 1,
      name: "prints a failing JSON receipt with a nonzero exit",
      violation: true,
    },
    {
      args: ["--not-an-option"],
      expectedExit: 1,
      name: "rejects unknown options with bounded output",
      violation: false,
    },
  ])(
    "$name",
    ({ args, violation, expectedExit }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
        const root = yield* path.fromFileUrl(new URL("../..", import.meta.url));
        if (violation) {
          const fixture = path.join(
            root,
            "docs/.generated-documentation-violation.md"
          );
          // Acquire before writing so interruption also removes this exact owned file.
          yield* Effect.acquireRelease(Effect.succeed(fixture), (ownedPath) =>
            fs.remove(ownedPath, { force: true }).pipe(Effect.orDie)
          );
          yield* fs.writeFileString(
            fixture,
            "# Candidate without required metadata\n"
          );
        }
        const child = yield* spawner.spawn(
          ChildProcess.make(
            "bun",
            [
              "--conditions=source",
              "run",
              "tools/documentation/check.runtime.ts",
              ...args,
            ],
            {
              cwd: root,
              extendEnv: true,
              stderr: "pipe",
              stdin: "ignore",
              stdout: "pipe",
            }
          )
        );
        const [exitCode, stdout, stderr] = yield* Effect.all(
          [
            child.exitCode,
            Stream.mkString(Stream.decodeText(child.stdout)),
            Stream.mkString(Stream.decodeText(child.stderr)),
          ],
          { concurrency: "unbounded" }
        );
        expect(Number(exitCode)).toBe(expectedExit);
        expect(stderr.length).toBeLessThan(1000);
        expect(stderr).not.toMatch(/\/Users\/[^/\s]+\//u);
        expect(stderr).not.toContain("DocumentationCheckError:");
        if (Array.contains(args, "--json")) {
          const receipt = yield* Schema.decodeEffect(
            Schema.fromJsonString(DocumentationReceipt)
          )(stdout);
          expect(receipt.ok).toBe(!violation);
          expect(receipt.reportPath).toBe("tmp/docs-policy-report.json");
          expect(receipt.nonClaim).toContain(
            "does not establish public availability"
          );
          expect(
            Array.some(
              receipt.diagnostics,
              (finding) =>
                finding.target === "docs/.generated-documentation-violation.md"
            )
          ).toBe(violation);
          const detail = yield* fs
            .readFileString(path.join(root, receipt.reportPath))
            .pipe(
              Effect.flatMap(
                Schema.decodeEffect(Schema.fromJsonString(DocumentationReceipt))
              )
            );
          expect(detail.ok).toBe(!violation);
          expect(detail.omittedDiagnostics).toBe(0);
          expect(detail.diagnostics).toHaveLength(detail.violationCount);
        } else if (args.length === 0) {
          expect(stdout).toContain("Documentation policy passed.");
          expect(stdout).toContain("violations=0");
          expect(stderr).toBe("");
        } else {
          expect(stdout.length).toBeLessThan(1500);
          expect(stdout).toContain("USAGE");
          expect(stdout).toContain("check-docs [flags]");
          expect(stderr).toContain("Documentation check could not complete");
        }
      }).pipe(Effect.provide(BunServices.layer)),
    15_000
  );
});
