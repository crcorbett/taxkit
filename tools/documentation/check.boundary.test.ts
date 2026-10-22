import { assert, describe, it } from "@effect/vitest";
import { HashMap, HashSet } from "effect";

import { inspectDocumentation } from "./check.boundary.js";

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
