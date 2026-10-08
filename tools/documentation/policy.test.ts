import { describe, expect, it as test } from "@effect/vitest";
import { Array, HashMap, HashSet, Schema } from "effect";

import { inspectDocumentation } from "./policy.js";
import { PublicPageAcceptanceRecord } from "./schemas.js";
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
      path: "packages/docs-content/navigation.json",
    },
    roots: ["packages/docs-content/content"],
    statusDecision: {
      acceptanceRecords: [],
      owner: "product-owner",
      path: "docs/documentation-audit/hgi-207/public-mdx-lifecycle.json",
      semantics: "accepted-public-lifecycle",
      statuses: {
        draft: "authored-candidate",
        published: "accepted-current",
      },
    },
  },
  sdkDocs: { owner: "sdk-owner", roots: ["packages/sdk/typescript/README.md"] },
};

const current = (path: string, body = "") => ({
  path,
  text: `---\ndocument_type: guide\nlifecycle: current\nauthority: canonical\nowner: docs-owner\nlast_reviewed: 2026-07-21\n---\n${body}`,
});
const acceptedRecord = (targetPath: string) =>
  PublicPageAcceptanceRecord.make({
    observedAt: "2026-07-21T22:30:00Z",
    owner: "product-owner",
    schemaVersion: 1,
    state: "accepted",
    targetPath,
  });
const completeOwnerFiles = [
  { path: "packages/docs-content/navigation.json", text: '{"status":"draft"}' },
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
      rootScripts: HashSet.fromIterable(["verification"]),
      workspaceScripts: HashMap.fromIterable([
        [
          "packages/api",
          { name: "api-group", scripts: HashSet.empty<string>() },
        ],
        [
          "packages/api/http",
          {
            name: "@taxkit/api-http",
            scripts: HashSet.fromIterable(["test", "test:openapi"]),
          },
        ],
        [
          "packages/docs-content",
          {
            name: "@taxkit/docs-content",
            scripts: HashSet.fromIterable(["build"]),
          },
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
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.fromIterable([
        [
          "packages/api/http",
          {
            name: "@taxkit/api-http",
            scripts: HashSet.fromIterable(["test", "test:openapi"]),
          },
        ],
        [
          "packages/docs-content",
          {
            name: "@taxkit/docs-content",
            scripts: HashSet.fromIterable(["build"]),
          },
        ],
      ]),
    });
    expect(
      Array.some(
        report.diagnostics,
        (item) =>
          item.invariant === "owner-policy" && item.owner === "api-owner"
      )
    ).toBe(true);
    expect(
      Array.some(
        report.diagnostics,
        (item) =>
          item.invariant === "lifecycle-successor" &&
          item.target === "docs/old.md"
      )
    ).toBe(true);
    expect(
      Array.every(
        report.diagnostics,
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
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.fromIterable([
        [
          "packages/api/http",
          {
            name: "@taxkit/api-http",
            scripts: HashSet.fromIterable(["test", "test:openapi"]),
          },
        ],
        [
          "packages/docs-content",
          {
            name: "@taxkit/docs-content",
            scripts: HashSet.fromIterable(["build"]),
          },
        ],
      ]),
    });
    expect(report.diagnostics).toEqual([]);
  });

  test("accepts represented public statuses without inferring external availability and does not skip app or docs-package manifests", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: draft\n---",
        },
        { path: "apps/docs/package.json", text: "{}" },
        { path: "packages/docs-content/package.json", text: "{}" },
      ],
      ownerPolicy,
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.empty(),
    });
    expect(report.public).toBe(2);
    expect(
      Array.some(
        report.diagnostics,
        (item) =>
          item.target === "apps/docs/package.json" &&
          item.invariant === "workspace-readme"
      )
    ).toBe(true);
    expect(
      Array.some(
        report.diagnostics,
        (item) => item.target === "packages/docs-content/content/reference.mdx"
      )
    ).toBe(false);
    expect(
      Array.every(
        report.diagnostics,
        (item) =>
          item.invariant !== "maintainer-metadata" ||
          item.target !== "packages/docs-content/content/reference.mdx"
      )
    ).toBe(true);
  });

  test("rejects a public status outside the accepted lifecycle representation", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: review\n---",
        },
      ],
      ownerPolicy,
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.empty(),
    });
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        invariant: "owner-policy",
        owner: "product-owner",
        target: "packages/docs-content/content/reference.mdx",
      })
    );
  });

  test("accepts published MDX and navigation only with exact addressable acceptance records", () => {
    const acceptedReference = acceptedRecord(
      "packages/docs-content/content/reference.mdx"
    );
    const acceptedNavigation = acceptedRecord(
      "packages/docs-content/navigation.json"
    );
    const report = inspectDocumentation({
      acceptanceRecords: HashMap.fromIterable([
        ["docs/documentation-audit/accepted-reference.json", acceptedReference],
        [
          "docs/documentation-audit/accepted-navigation.json",
          acceptedNavigation,
        ],
      ]),
      files: [
        ...Array.filter(
          completeOwnerFiles,
          (file) => file.path !== "packages/docs-content/navigation.json"
        ),
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: published\n---",
        },
        {
          path: "packages/docs-content/navigation.json",
          text: '{"status":"published"}',
        },
        {
          path: "docs/documentation-audit/accepted-reference.json",
          text: Schema.encodeSync(
            Schema.fromJsonString(PublicPageAcceptanceRecord)
          )(acceptedReference),
        },
        {
          path: "docs/documentation-audit/accepted-navigation.json",
          text: Schema.encodeSync(
            Schema.fromJsonString(PublicPageAcceptanceRecord)
          )(acceptedNavigation),
        },
      ],
      ownerPolicy: {
        ...ownerPolicy,
        public: {
          ...ownerPolicy.public,
          statusDecision: {
            ...ownerPolicy.public.statusDecision,
            acceptanceRecords: [
              {
                path: "packages/docs-content/content/reference.mdx",
                record: "docs/documentation-audit/accepted-reference.json",
              },
              {
                path: "packages/docs-content/navigation.json",
                record: "docs/documentation-audit/accepted-navigation.json",
              },
            ],
          },
        },
      },
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.fromIterable([
        [
          "packages/api/http",
          {
            name: "@taxkit/api-http",
            scripts: HashSet.fromIterable(["test", "test:openapi"]),
          },
        ],
        [
          "packages/docs-content",
          {
            name: "@taxkit/docs-content",
            scripts: HashSet.fromIterable(["build"]),
          },
        ],
      ]),
    });
    expect(
      Array.filter(
        report.diagnostics,
        (item) => item.invariant === "owner-policy"
      )
    ).toEqual([]);
  });

  test("rejects a published public path without an exact acceptance-record binding", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: published\n---",
        },
      ],
      ownerPolicy,
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.empty(),
    });
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        invariant: "owner-policy",
        owner: "product-owner",
        repair:
          "bind this published public path to an addressable accepted record",
        target: "packages/docs-content/content/reference.mdx",
      })
    );
  });

  test("rejects a binding whose accepted record is missing", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: published\n---",
        },
      ],
      ownerPolicy: {
        ...ownerPolicy,
        public: {
          ...ownerPolicy.public,
          statusDecision: {
            ...ownerPolicy.public.statusDecision,
            acceptanceRecords: [
              {
                path: "packages/docs-content/content/reference.mdx",
                record: "docs/documentation-audit/missing-acceptance.json",
              },
            ],
          },
        },
      },
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.empty(),
    });
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        repair:
          "restore the addressable accepted record or remove its published-path binding",
        target: "docs/documentation-audit/missing-acceptance.json",
      })
    );
  });

  test("rejects an arbitrary existing file as an acceptance record", () => {
    const report = inspectDocumentation({
      files: [
        ...completeOwnerFiles,
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: published\n---",
        },
        {
          path: "docs/documentation-audit/not-an-acceptance-record.json",
          text: '{"state":"accepted"}',
        },
      ],
      ownerPolicy: {
        ...ownerPolicy,
        public: {
          ...ownerPolicy.public,
          statusDecision: {
            ...ownerPolicy.public.statusDecision,
            acceptanceRecords: [
              {
                path: "packages/docs-content/content/reference.mdx",
                record:
                  "docs/documentation-audit/not-an-acceptance-record.json",
              },
            ],
          },
        },
      },
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.empty(),
    });
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        repair: "replace this file with a valid accepted page-level record",
        target: "docs/documentation-audit/not-an-acceptance-record.json",
      })
    );
  });

  test("rejects an accepted record bound to the wrong target", () => {
    const record = "docs/documentation-audit/wrong-target.json";
    const wrongTarget = acceptedRecord(
      "packages/docs-content/content/other.mdx"
    );
    const report = inspectDocumentation({
      acceptanceRecords: HashMap.fromIterable([[record, wrongTarget]]),
      files: [
        ...completeOwnerFiles,
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: published\n---",
        },
        {
          path: record,
          text: Schema.encodeSync(
            Schema.fromJsonString(PublicPageAcceptanceRecord)
          )(wrongTarget),
        },
      ],
      ownerPolicy: {
        ...ownerPolicy,
        public: {
          ...ownerPolicy.public,
          statusDecision: {
            ...ownerPolicy.public.statusDecision,
            acceptanceRecords: [
              { path: "packages/docs-content/content/reference.mdx", record },
            ],
          },
        },
      },
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.empty(),
    });
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        repair:
          "bind the accepted record targetPath exactly to packages/docs-content/content/reference.mdx",
        target: record,
      })
    );
  });

  test("rejects a stale accepted-record binding for a draft path", () => {
    const record = "docs/documentation-audit/stale-acceptance.json";
    const staleAcceptance = acceptedRecord(
      "packages/docs-content/content/reference.mdx"
    );
    const report = inspectDocumentation({
      acceptanceRecords: HashMap.fromIterable([[record, staleAcceptance]]),
      files: [
        ...completeOwnerFiles,
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: draft\n---",
        },
        {
          path: record,
          text: Schema.encodeSync(
            Schema.fromJsonString(PublicPageAcceptanceRecord)
          )(staleAcceptance),
        },
      ],
      ownerPolicy: {
        ...ownerPolicy,
        public: {
          ...ownerPolicy.public,
          statusDecision: {
            ...ownerPolicy.public.statusDecision,
            acceptanceRecords: [
              { path: "packages/docs-content/content/reference.mdx", record },
            ],
          },
        },
      },
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.empty(),
    });
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        repair:
          "remove the stale accepted-record binding or restore the exact published public path",
        target: "packages/docs-content/content/reference.mdx",
      })
    );
  });

  test("rejects duplicate public-path acceptance bindings", () => {
    const firstRecord = "docs/documentation-audit/accepted-reference-1.json";
    const secondRecord = "docs/documentation-audit/accepted-reference-2.json";
    const acceptedReference = acceptedRecord(
      "packages/docs-content/content/reference.mdx"
    );
    const report = inspectDocumentation({
      acceptanceRecords: HashMap.fromIterable([
        [firstRecord, acceptedReference],
        [secondRecord, acceptedReference],
      ]),
      files: [
        ...completeOwnerFiles,
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: published\n---",
        },
        {
          path: firstRecord,
          text: Schema.encodeSync(
            Schema.fromJsonString(PublicPageAcceptanceRecord)
          )(acceptedReference),
        },
        {
          path: secondRecord,
          text: Schema.encodeSync(
            Schema.fromJsonString(PublicPageAcceptanceRecord)
          )(acceptedReference),
        },
      ],
      ownerPolicy: {
        ...ownerPolicy,
        public: {
          ...ownerPolicy.public,
          statusDecision: {
            ...ownerPolicy.public.statusDecision,
            acceptanceRecords: [
              {
                path: "packages/docs-content/content/reference.mdx",
                record: firstRecord,
              },
              {
                path: "packages/docs-content/content/reference.mdx",
                record: secondRecord,
              },
            ],
          },
        },
      },
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.empty(),
    });
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        repair:
          "keep exactly one accepted-record binding for each published public path",
        target: "packages/docs-content/content/reference.mdx",
      })
    );
  });

  test("rejects one acceptance record bound to duplicate public paths", () => {
    const record = "docs/documentation-audit/shared-acceptance.json";
    const sharedAcceptance = acceptedRecord(
      "packages/docs-content/content/reference.mdx"
    );
    const report = inspectDocumentation({
      acceptanceRecords: HashMap.fromIterable([[record, sharedAcceptance]]),
      files: [
        ...completeOwnerFiles,
        {
          path: "packages/docs-content/content/reference.mdx",
          text: "---\nstatus: published\n---",
        },
        {
          path: "packages/docs-content/content/guide.mdx",
          text: "---\nstatus: published\n---",
        },
        {
          path: record,
          text: Schema.encodeSync(
            Schema.fromJsonString(PublicPageAcceptanceRecord)
          )(sharedAcceptance),
        },
      ],
      ownerPolicy: {
        ...ownerPolicy,
        public: {
          ...ownerPolicy.public,
          statusDecision: {
            ...ownerPolicy.public.statusDecision,
            acceptanceRecords: [
              { path: "packages/docs-content/content/reference.mdx", record },
              { path: "packages/docs-content/content/guide.mdx", record },
            ],
          },
        },
      },
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.empty(),
    });
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        repair:
          "bind each accepted record to exactly one published public path",
        target: record,
      })
    );
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
      rootScripts: HashSet.empty(),
      workspaceScripts: HashMap.fromIterable([
        [
          "packages/api/http",
          {
            name: "@taxkit/api-http",
            scripts: HashSet.fromIterable(["test", "test:openapi"]),
          },
        ],
        [
          "packages/docs-content",
          {
            name: "@taxkit/docs-content",
            scripts: HashSet.fromIterable(["build"]),
          },
        ],
      ]),
    });
    expect(
      Array.filter(
        report.diagnostics,
        (item) => item.invariant === "local-bun-command"
      )
    ).toEqual([
      expect.objectContaining({
        target: "docs/current.md",
      }),
    ]);
    expect(
      Array.some(
        report.diagnostics,
        (item) => item.invariant === "relative-link"
      )
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
      rootScripts: HashSet.fromIterable(["absent"]),
      workspaceScripts: HashMap.fromIterable([
        [
          "packages/docs-content",
          {
            name: "@taxkit/docs-content",
            scripts: HashSet.fromIterable(["build"]),
          },
        ],
      ]),
    });
    expect(
      Array.filter(
        report.diagnostics,
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
