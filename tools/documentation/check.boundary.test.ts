import { assert, describe, it } from "@effect/vitest";
import { Array, Function as EffectFunction, HashMap, HashSet } from "effect";

import { inspectDocumentation, isDocumentation } from "./check.boundary.js";

const scripts = {
  root: HashSet.make("verification"),
  workspaces: HashMap.make(["web", HashSet.make("build")]),
};
describe("documentation inspection", () => {
  it("accepts resolved links and known commands", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: (path) => path === "docs/other.md",
        files: [
          {
            path: "docs/guide.md",
            text: `See [other](./other.md#part), [site](https://taxkit.dev) and run \`bun run verification\` or \`bun run --filter=web build\`.`,
          },
        ],
        scripts,
      }),
      []
    );
  });

  it("reports broken links and unknown commands", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: () => false,
        files: [
          {
            path: "docs/guide.md",
            text: `[gone](./gone.md) [out](../../outside.md) \`bun run release:present\` \`bun run --filter=web deploy\``,
          },
        ],
        scripts,
      }),
      [
        "docs/guide.md: broken link: ./gone.md",
        "docs/guide.md: link leaves the repository: ../../outside.md",
        "docs/guide.md: unknown root command: bun run release:present",
        "docs/guide.md: unknown command: bun run --filter=web deploy",
      ]
    );
  });

  it("checks every document regardless of front matter", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: () => false,
        files: [
          { path: "docs/untitled.md", text: "No front matter." },
          {
            path: "docs/history.md",
            text: "---\nlifecycle: historical\n---\n[gone](./gone.md) `bun run release:present`",
          },
        ],
        scripts,
      }),
      [
        "docs/history.md: broken link: ./gone.md",
        "docs/history.md: unknown root command: bun run release:present",
      ]
    );
  });

  it("checks fragments against GitHub heading slugs", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: (path) => path === "docs/other.md",
        files: [
          {
            path: "docs/guide.md",
            text: [
              "# Guide",
              "## Website/API graph",
              "## `bun run` and [links](./other.md)",
              "## Repeat",
              "## Repeat",
              '<a id="explicit-anchor"></a>',
              "```md",
              "## Fenced heading",
              "```",
              "[a](#website-api-graph) [b](#websiteapi-graph) [c](#bun-run-and-links)",
              "[d](#repeat-1) [e](#repeat-2) [f](#explicit-anchor) [g](#fenced-heading)",
              "[h](./other.md#Section-One) [i](./other.md#missing)",
            ].join("\n"),
          },
          {
            path: "docs/other.md",
            text: "---\ntitle: Other\n---\n## Section one ##\n",
          },
        ],
        scripts,
      }),
      [
        "docs/guide.md: broken anchor: #website-api-graph",
        "docs/guide.md: broken anchor: #repeat-2",
        "docs/guide.md: broken anchor: #fenced-heading",
        "docs/guide.md: broken anchor: ./other.md#missing",
      ]
    );
  });

  it("does not check fragments of files outside the document set", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: () => true,
        files: [
          {
            path: "docs/guide.md",
            text: "[source](../src/index.ts#L10) [notes](../CHANGELOG.md#100)",
          },
        ],
        scripts,
      }),
      []
    );
  });

  it("reports an unknown workspace filter", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: () => true,
        files: [
          {
            path: "README.md",
            text: "`bun run --filter=@taxkit/gone build` `bun run --filter='./apps/*' build`",
          },
        ],
        scripts,
      }),
      [
        "README.md: unknown workspace: bun run --filter=@taxkit/gone build",
        "README.md: unknown workspace: bun run --filter='./apps/*' build",
      ]
    );
  });

  it("selects every document except release notes", () => {
    assert.deepEqual(
      EffectFunction.pipe(
        [
          "CONTEXT.md",
          "apps/web/DESIGN.md",
          "content/docs/README.md",
          "packages/core/CHANGELOG.md",
          ".changeset/tasty-pans-mate.md",
          "apps/web/src/index.ts",
        ],
        Array.filter(isDocumentation)
      ),
      ["CONTEXT.md", "apps/web/DESIGN.md", "content/docs/README.md"]
    );
  });

  it("ignores links and commands inside code", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: () => false,
        files: [
          {
            path: "README.md",
            text: "```md\n[gone](./gone.md)\n```\n`[gone](./gone.md)`",
          },
        ],
        scripts,
      }),
      []
    );
  });
});
