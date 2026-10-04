import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { applyCodeBlockMeta } from "./code-block-meta.js";
import { effectSchemaToStandardSchema } from "./config.js";

describe("effectSchemaToStandardSchema", () => {
  it("keeps Effect Schema authoritative for Standard Schema validation", () => {
    const PageFrontmatter = Schema.Struct({
      description: Schema.String,
      title: Schema.String,
    });
    const { "~standard": validation } =
      effectSchemaToStandardSchema(PageFrontmatter);

    expect(
      validation.validate({
        description: "Use package helpers.",
        title: "Docs package",
      })
    ).toEqual({
      value: {
        description: "Use package helpers.",
        title: "Docs package",
      },
    });
    expect(
      validation.validate({
        title: "Docs package",
      })
    ).toHaveProperty("issues");
  });
});

describe("code block metadata", () => {
  it("copies code block title and language to data attributes", () => {
    const node = {
      children: [],
      properties: {},
      tagName: "pre",
      type: "element",
    } satisfies Parameters<typeof applyCodeBlockMeta>[0];

    const result = applyCodeBlockMeta(node, {
      lang: "ts",
      meta: {
        title: "example.ts",
      },
    });

    expect(node.properties).toEqual({});
    expect(result.properties).toEqual({
      "data-language": "ts",
      "data-title": "example.ts",
    });
  });
});
