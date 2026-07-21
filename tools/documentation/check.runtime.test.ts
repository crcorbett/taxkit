import { describe, expect, test } from "bun:test";

import { Effect } from "effect";

import { decodePublicPageAcceptanceRecord } from "./check.runtime.js";
import { classifyDocumentationPath } from "./policy.js";
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
    navigation: { owner: "public", path: "apps/docs/navigation.json" },
    roots: ["apps/docs/content"],
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
  test("decodes only the strict accepted page-level record JSON contract", async () => {
    const valid = JSON.stringify({
      observedAt: "2026-07-21T22:30:00Z",
      owner: "product-owner",
      schemaVersion: 1,
      state: "accepted",
      targetPath: "apps/docs/content/guide.mdx",
    });
    await expect(
      Effect.runPromise(decodePublicPageAcceptanceRecord(valid))
    ).resolves.toEqual(
      expect.objectContaining({
        state: "accepted",
        targetPath: "apps/docs/content/guide.mdx",
      })
    );
    for (const invalid of [
      '{"state":"accepted"}',
      JSON.stringify({
        observedAt: "not-a-timestamp",
        owner: "product-owner",
        schemaVersion: 1,
        state: "accepted",
        targetPath: "apps/docs/content/guide.mdx",
      }),
      JSON.stringify({
        observedAt: "2026-07-21T22:30:00Z",
        owner: "product-owner",
        schemaVersion: 1,
        state: "draft",
        targetPath: "apps/docs/content/guide.mdx",
      }),
      JSON.stringify({
        extra: true,
        observedAt: "2026-07-21T22:30:00Z",
        owner: "product-owner",
        schemaVersion: 1,
        state: "accepted",
        targetPath: "apps/docs/content/guide.mdx",
      }),
    ]) {
      const exit = await Effect.runPromiseExit(
        decodePublicPageAcceptanceRecord(invalid)
      );
      expect(exit._tag).toBe("Failure");
    }
  });

  test("keeps public content, maintainer docs, generated OpenAPI, and workspace manifests separate", () => {
    expect(
      classifyDocumentationPath(policy, "apps/docs/content/guide.mdx")
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
