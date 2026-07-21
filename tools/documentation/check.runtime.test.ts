import { describe, expect, test } from "bun:test";

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
      owner: "product",
      path: "docs/documentation-audit/hgi-207/public-mdx-lifecycle.json",
      semantics: "deferred-opaque",
    },
  },
  sdkDocs: { owner: "sdk", roots: ["packages/sdk/typescript/README.md"] },
} satisfies OwnerPolicy;

describe("documentation checker path classes", () => {
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
