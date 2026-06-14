import { Option, Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  effectSchemaToStandardSchema,
  fumadocsMetaStandardSchema,
  transformerCodeBlockMeta,
} from "./config.js";

describe("effectSchemaToStandardSchema", () => {
  it("keeps Effect Schema authoritative for Standard Schema validation", () => {
    const PageFrontmatter = Schema.Struct({
      description: Schema.String,
      title: Schema.String,
    });
    const standardSchema = effectSchemaToStandardSchema(PageFrontmatter);

    expect(
      standardSchema["~standard"].validate({
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
      standardSchema["~standard"].validate({
        title: "Docs package",
      })
    ).toHaveProperty("issues");
  });

  it("exposes a generic Fumadocs meta schema", () => {
    expect(
      fumadocsMetaStandardSchema["~standard"].validate({
        defaultOpen: true,
        pages: ["index", "guide"],
        title: "Docs",
      })
    ).toEqual({
      value: {
        defaultOpen: true,
        pages: ["index", "guide"],
        title: "Docs",
      },
    });
  });
});

describe("transformerCodeBlockMeta", () => {
  it("copies code block title and language to data attributes", () => {
    const transformer = transformerCodeBlockMeta();
    const node = { properties: {} };

    Option.fromUndefinedOr(transformer.pre).pipe(
      Option.match({
        onNone: () => null,
        onSome: (pre) =>
          Reflect.apply(
            pre,
            {
              options: {
                lang: "ts",
                meta: {
                  title: "example.ts",
                },
                themes: { dark: "github-dark", light: "github-light" },
              },
            },
            [node]
          ),
      })
    );

    expect(node.properties).toEqual({
      "data-language": "ts",
      "data-title": "example.ts",
    });
  });
});
