import { describe, expect, test } from "bun:test";

import { inspectDocumentation } from "./policy.js";
import type { OwnerPolicy } from "./schemas.js";

const ownerPolicy: OwnerPolicy = {
  fumadocs: {
    build: {
      command: "build",
      owner: "docs-content-owner",
      path: "packages/docs-content/package.json",
    },
    generatedRoot: "packages/docs-content/.source",
    source: {
      owner: "docs-content-owner",
      path: "packages/docs-content/source.config.ts",
    },
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
      owner: "api-owner",
      path: "packages/api/http/src/server/live.layer.ts",
    },
    snapshot: {
      owner: "api-owner",
      path: "packages/api/http/__snapshots__/openapi.json",
    },
    source: { owner: "api-owner", path: "packages/api/http/src/openapi.ts" },
    test: {
      command: "test:openapi",
      owner: "api-owner",
      path: "packages/api/http/__tests__/openapi-snapshot.test.ts",
    },
  },
  public: {
    navigation: {
      owner: "public-docs-owner",
      path: "apps/docs/navigation.json",
    },
    roots: ["apps/docs/content"],
    statusDecision: {
      owner: "product-owner",
      path: "docs/documentation-audit/hgi-207/public-mdx-lifecycle.json",
      semantics: "deferred-opaque",
    },
  },
  sdkDocs: { owner: "sdk-owner", roots: ["packages/sdk/typescript/README.md"] },
};

const current = (path: string, body = "") => ({
  path,
  text: `---\ndocument_type: guide\nlifecycle: current\nauthority: canonical\nowner: docs-owner\nlast_reviewed: 2026-07-21\n---\n${body}`,
});
const completeOwnerFiles = [
  { path: "apps/docs/navigation.json", text: '{"status":"draft"}' },
  { path: "packages/docs-content/source.config.ts", text: "source" },
  { path: "packages/docs-content/package.json", text: "{}" },
  {
    path: "packages/docs-content/README.md",
    text: "---\nstatus: canonical\nlast_reviewed: 2026-07-21\nsource_of_truth: package\nconfidence: high\n---",
  },
  { path: "packages/api/http/src/openapi.ts", text: "source" },
  { path: "packages/api/http/__snapshots__/openapi.json", text: "snapshot" },
  {
    path: "packages/api/http/__tests__/openapi-snapshot.test.ts",
    text: "test",
  },
  { path: "packages/api/http/src/server/live.layer.ts", text: "route" },
  { path: "packages/sdk/typescript/README.md", text: "authored SDK docs" },
  {
    path: "docs/documentation-audit/hgi-207/public-mdx-lifecycle.json",
    text: "decision",
  },
];

describe("documentation policy", () => {
  test("uses the decoded owner policy for current maintainer, generated, package, and relative-link checks", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        current(
          "docs/README.md",
          "[architecture](./architecture/README.md)\n`bun run verification`"
        ),
        current("docs/architecture/README.md"),
        { path: "packages/api/http/package.json", text: "{}" },
        {
          path: "packages/api/http/README.md",
          text: "---\nstatus: canonical\nlast_reviewed: 2026-07-21\nsource_of_truth: package\nconfidence: high\n---",
        },
      ],
      ownerPolicy,
      rootScripts: new Set(["verification"]),
      workspaceScripts: new Map([
        ["packages/api", { name: "api-group", scripts: new Set<string>() }],
        [
          "packages/api/http",
          {
            name: "@taxkit/api-http",
            scripts: new Set(["test", "test:openapi"]),
          },
        ],
        [
          "packages/docs-content",
          { name: "@taxkit/docs-content", scripts: new Set(["build"]) },
        ],
      ]),
    });
    expect(report.diagnostics).toEqual([]);
  });

  test("reports exact target, owner, and repair for missing owner-policy and lifecycle targets", () => {
    const report = inspectDocumentation({
      files: [
        {
          path: "docs/old.md",
          text: "---\ndocument_type: guide\nlifecycle: tombstone\nauthority: canonical\nowner: docs-owner\nlast_reviewed: 2026-07-21\n---",
        },
      ],
      ownerPolicy,
      rootScripts: new Set(),
      workspaceScripts: new Map([
        [
          "packages/api/http",
          {
            name: "@taxkit/api-http",
            scripts: new Set(["test", "test:openapi"]),
          },
        ],
        [
          "packages/docs-content",
          { name: "@taxkit/docs-content", scripts: new Set(["build"]) },
        ],
      ]),
    });
    expect(
      report.diagnostics.some(
        (item) =>
          item.invariant === "owner-policy" && item.owner === "api-owner"
      )
    ).toBe(true);
    expect(
      report.diagnostics.some(
        (item) =>
          item.invariant === "lifecycle-successor" &&
          item.target === "docs/old.md"
      )
    ).toBe(true);
    expect(
      report.diagnostics.every(
        (item) =>
          item.owner.length > 0 &&
          item.target.length > 0 &&
          item.repair.length > 0
      )
    ).toBe(true);
  });

  test("accepts the router legacy metadata contract and does not impose fictional historical exemptions", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        {
          path: "docs/repo-status-outline.html",
          text: "---\nstatus: canonical\nlast_reviewed: 2026-07-21\nsource_of_truth: snapshot\nconfidence: high\n---",
        },
        {
          path: "docs/history.md",
          text: "---\ndocument_type: record\nlifecycle: historical\nauthority: retained\nowner: docs-owner\nlast_reviewed: 2026-07-21\n---",
        },
      ],
      ownerPolicy,
      rootScripts: new Set(),
      workspaceScripts: new Map([
        [
          "packages/api/http",
          {
            name: "@taxkit/api-http",
            scripts: new Set(["test", "test:openapi"]),
          },
        ],
        [
          "packages/docs-content",
          { name: "@taxkit/docs-content", scripts: new Set(["build"]) },
        ],
      ]),
    });
    expect(report.diagnostics).toEqual([]);
  });

  test("treats public draft as opaque and does not skip app or docs-package manifests", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        {
          path: "apps/docs/content/reference.mdx",
          text: "---\nstatus: draft\n---",
        },
        { path: "apps/docs/package.json", text: "{}" },
        { path: "packages/docs-content/package.json", text: "{}" },
      ],
      ownerPolicy,
      rootScripts: new Set(),
      workspaceScripts: new Map(),
    });
    expect(report.public).toBe(2);
    expect(
      report.diagnostics.some(
        (item) =>
          item.target === "apps/docs/package.json" &&
          item.invariant === "workspace-readme"
      )
    ).toBe(true);
    expect(
      report.diagnostics.every(
        (item) =>
          item.invariant !== "maintainer-metadata" ||
          item.target !== "apps/docs/content/reference.mdx"
      )
    ).toBe(true);
  });

  test("checks current command examples while leaving historical code-shaped prose inert", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        current(
          "docs/current.md",
          "```sh\nbun run absent\n```\n`[literal](target)`"
        ),
        {
          path: "docs/history.md",
          text: "---\ndocument_type: record\nlifecycle: historical\nauthority: supporting\nowner: docs-owner\nlast_reviewed: 2026-07-21\n---\n`bun run absent`\n[label](target)",
        },
      ],
      ownerPolicy,
      rootScripts: new Set(),
      workspaceScripts: new Map([
        [
          "packages/api/http",
          {
            name: "@taxkit/api-http",
            scripts: new Set(["test", "test:openapi"]),
          },
        ],
        [
          "packages/docs-content",
          { name: "@taxkit/docs-content", scripts: new Set(["build"]) },
        ],
      ]),
    });
    expect(
      report.diagnostics.filter(
        (item) => item.invariant === "local-bun-command"
      )
    ).toEqual([
      expect.objectContaining({
        target: "docs/current.md",
      }),
    ]);
    expect(
      report.diagnostics.some((item) => item.invariant === "relative-link")
    ).toBe(false);
  });

  test("resolves filtered Bun commands against the selected workspace", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        current(
          "docs/commands.md",
          "```sh\nbun run --filter=@taxkit/docs-content build\nbun run --filter=<package> build\nbun run --filter @taxkit/docs-content absent\nbun run --filter=<package> nowhere\n```"
        ),
      ],
      ownerPolicy,
      rootScripts: new Set(["absent"]),
      workspaceScripts: new Map([
        [
          "packages/docs-content",
          { name: "@taxkit/docs-content", scripts: new Set(["build"]) },
        ],
      ]),
    });
    expect(
      report.diagnostics.filter(
        (item) => item.invariant === "local-bun-command"
      )
    ).toEqual([
      expect.objectContaining({
        repair:
          "document an existing local bun script instead of bun run --filter=@taxkit/docs-content absent",
        target: "docs/commands.md",
      }),
      expect.objectContaining({
        repair:
          "document an existing local bun script instead of bun run --filter=<package> nowhere",
        target: "docs/commands.md",
      }),
    ]);
  });
});
