import { assert, describe, it } from "@effect/vitest";
import { HashMap, HashSet } from "effect";

import { inspectDocumentation } from "./check.boundary.js";

const scripts = {
  root: HashSet.make("verification"),
  workspaces: HashMap.make(["web", HashSet.make("build")]),
};
const metadata =
  "---\ndocument_type: guide\nlifecycle: current\nowner: maintainers\n---\n";

describe("documentation inspection", () => {
  it("accepts resolved links, known commands and metadata", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: (path) => path === "docs/other.md",
        files: [
          {
            path: "docs/guide.md",
            text: `${metadata}See [other](./other.md#part), [site](https://taxkit.dev) and run \`bun run verification\` or \`bun run --filter=web build\`.`,
          },
        ],
        scripts,
      }),
      []
    );
  });

  it("reports broken links and unknown commands in current documents", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: () => false,
        files: [
          {
            path: "docs/guide.md",
            text: `${metadata}[gone](./gone.md) [out](../../outside.md) \`bun run release:present\` \`bun run --filter=web deploy\``,
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

  it("requires metadata and leaves historical references alone", () => {
    assert.deepEqual(
      inspectDocumentation({
        exists: () => false,
        files: [
          { path: "docs/untitled.md", text: "No metadata." },
          {
            path: "docs/history.md",
            text: "---\ndocument_type: plan\nlifecycle: historical\nowner: maintainers\n---\n[gone](./gone.md) `bun run release:present`",
          },
        ],
        scripts,
      }),
      ["docs/untitled.md: missing maintainer metadata"]
    );
  });
});
