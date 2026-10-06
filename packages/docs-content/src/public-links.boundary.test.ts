import { describe, expect, it } from "@effect/vitest";
import { Cause, Effect } from "effect";
import type { Root } from "mdast";
import { unified } from "unified";
import { VFile } from "vfile";

import { remarkPublicDocsLinks } from "./public-links.boundary.js";
import {
  DocsPublicLinkProfile,
  DocsRepositoryRevision,
} from "./public-links.schema.js";
import { DocsNavigation, DocsPagePath, DocsSourcePath } from "./schemas.js";

const revision = "a151e51e8a30247526fa93412df046955846eca4";
const navigation = DocsNavigation.make({
  contentRoot: "packages/docs-content/content",
  primaryNavigation: [
    {
      pageType: "section index",
      path: DocsPagePath.make("/reference"),
      primaryReader: "Application integrator",
      source: DocsSourcePath.make("content/reference/index.mdx"),
      title: "Reference",
    },
    {
      pageType: "section index",
      pages: [
        {
          pageType: "concept",
          path: DocsPagePath.make("/start/overview"),
          primaryReader: "SDK evaluator",
          source: DocsSourcePath.make("content/start/overview.mdx"),
          title: "Overview",
        },
      ],
      path: DocsPagePath.make("/start"),
      primaryReader: "SDK evaluator",
      source: DocsSourcePath.make("content/start/index.mdx"),
      title: "Start",
    },
  ],
  status: "draft",
});
const processor = unified().use(remarkPublicDocsLinks, {
  contentRoot: new URL("file:///checkout/packages/docs-content/content/"),
  navigation,
  profile: DocsPublicLinkProfile.make({
    repositoryRevision: DocsRepositoryRevision.make(revision),
    repositoryUrl: new URL("https://github.com/crcorbett/taxkit"),
  }),
  repositoryRoot: new URL("file:///checkout/"),
});
const source = "/checkout/packages/docs-content/content/guides/example.mdx";

describe("public documentation compiler links", () => {
  it.effect.each([
    ["../reference/index.mdx?view=all#reports", "/reference?view=all#reports"],
    ["../start/overview.mdx", "/start/overview"],
    ["/start/overview#inputs", "/start/overview#inputs"],
    ["#inputs", "#inputs"],
    ["?view=all", "?view=all"],
    ["https://example.com/page", "https://example.com/page"],
    ["mailto:example@example.com", "mailto:example@example.com"],
    ["//example.com/page", "//example.com/page"],
    [
      "../../../core/src/errors.ts#L12",
      `https://github.com/crcorbett/taxkit/blob/${revision}/packages/core/src/errors.ts#L12`,
    ],
    [
      "../../../../docs/architecture/file%20name.md",
      `https://github.com/crcorbett/taxkit/blob/${revision}/docs/architecture/file%20name.md`,
    ],
  ] as const)("maps %s without changing the supplied tree", ([url, expected]) =>
    Effect.gen(function* () {
      const definition = {
        identifier: "guide",
        type: "definition" as const,
        url,
      };
      const tree: Root = {
        children: [
          {
            children: [{ children: [], type: "link", url }],
            type: "paragraph",
          },
          definition,
          { type: "code", value: `[Example](${url})` },
        ],
        type: "root",
      };
      const output = yield* Effect.promise(() =>
        processor.run(tree, new VFile({ path: source }))
      );
      expect(output).toEqual({
        ...tree,
        children: [
          {
            children: [{ children: [], type: "link", url: expected }],
            type: "paragraph",
          },
          { identifier: "guide", type: "definition", url: expected },
          { type: "code", value: `[Example](${url})` },
        ],
      });
      expect(definition).toEqual({
        identifier: "guide",
        type: "definition",
        url,
      });
      expect(output).not.toBe(tree);
    })
  );

  it.effect.each([
    [
      "../reference/missing.mdx",
      "The documentation source is not in navigation.",
    ],
    ["/missing", "The documentation address is not in navigation."],
    [
      "../../../../../outside.md",
      "The documentation link leaves the repository.",
    ],
  ] as const)("rejects an unowned destination %s", ([url, message]) =>
    Effect.gen(function* () {
      const tree: Root = {
        children: [
          {
            children: [{ children: [], type: "link", url }],
            type: "paragraph",
          },
        ],
        type: "root",
      };
      // This SDK fixture keeps its cause only for the compiler assertion below;
      // runtime source adapters expose their fixed safe source error instead.
      const error = yield* Effect.tryPromise({
        catch: (cause) =>
          new Cause.UnknownError(cause, "Compiler fixture rejected."),
        try: () => processor.run(tree, new VFile({ path: source })),
      }).pipe(Effect.flip);
      expect(error.cause).toMatchObject({ reason: message });
    })
  );

  it.effect("rejects a compiler input without a source path", () =>
    Effect.gen(function* () {
      const tree: Root = { children: [], type: "root" };
      const error = yield* Effect.tryPromise({
        catch: (cause) =>
          new Cause.UnknownError(cause, "Compiler fixture rejected."),
        try: () => processor.run(tree, new VFile()),
      }).pipe(Effect.flip);
      expect(error.cause).toMatchObject({
        reason: "The documentation compiler needs a source path.",
      });
    })
  );
});
