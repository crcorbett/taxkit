import { describe, expect, it } from "@effect/vitest";
import { createProcessor } from "@mdx-js/mdx";
import { Effect, Option } from "effect";
import { VFile } from "vfile";

import { getNavigation } from "../navigation.js";
import { DocsSourcePath } from "../schemas.js";
import {
  remarkMdxComponentPolicy,
  validateMdxComponentPolicy,
} from "./mdx-component-policy.js";
import { validateContent, validationSummary } from "./policy.js";

const expectedComponentMessage: unknown = expect.stringContaining(
  "MDX component not allowed:"
);

const literalExamples = [
  "`SdkCalculatorRunResponse<Report>` is inline code.",
  "```tsx\n<UnsafeComponent />\n```",
  "~~~tsx\n<UnsafeComponent />\n~~~",
  "````tsx\n```\n<UnsafeComponent />\n```\n````",
  "``literal ` and <UnsafeComponent />``",
  '{"<UnsafeComponent />"}',
  "{`<UnsafeComponent />`}",
  '<div title="<UnsafeComponent />" />',
  'export const literal = "<UnsafeComponent />"',
  "<div />",
  '<span aria-label="label">Text</span>',
  "<my-widget />",
  "~~~tsx\n<motion.div />\n~~~",
  '{"<components.Unsafe />"}',
] as const;

const executableExamples = [
  "<UnsafeComponent />",
  "Text with <UnsafeComponent /> inline.",
  "~~~tsx\n<Literal />\n~~~\n\n<UnsafeComponent />",
  "<div><UnsafeComponent /></div>",
  "<Namespace.UnsafeComponent />",
  "{<UnsafeComponent />}",
  "{true && <UnsafeComponent />}",
  "Text {<UnsafeComponent />} inline.",
  "<div title={<UnsafeComponent />} />",
  "<div {...{title: <UnsafeComponent />}} />",
  "export const unsafe = <UnsafeComponent />",
  "export const unsafe = () => <Namespace.UnsafeComponent />",
  "{<div title={<UnsafeComponent />} />}",
  "<motion.div />",
  "{<components.Unsafe />}",
  "{true && <motion.div />}",
  "<div title={<motion.div />} />",
  "export const unsafe = <motion.div />",
  "<components.UI.Unsafe />",
  "<_Unsafe />",
  "<$Unsafe />",
] as const;

describe("docs content validation policy", () => {
  it.effect("decodes navigation through the canonical schema", () =>
    Effect.gen(function* () {
      const navigation = yield* getNavigation;

      expect(navigation.contentRoot).toBe("packages/docs-content/content");
      expect(navigation.primaryNavigation.length).toBeGreaterThan(0);
    })
  );

  it.effect("validates the current public docs corpus", () =>
    Effect.gen(function* () {
      const result = yield* validateContent;

      expect(result.issues).toEqual([]);
      expect(Option.isNone(validationSummary(result))).toBe(true);
    })
  );

  it.effect.each(literalExamples)(
    "treats parser-owned literal code as text: %s",
    (markdown) =>
      Effect.gen(function* () {
        const source = DocsSourcePath.make("content/start/quickstart.mdx");
        expect(yield* validateMdxComponentPolicy(source, markdown)).toEqual([]);
      })
  );

  it.effect.each(executableExamples)(
    "rejects real JSX outside code: %s",
    (markdown) =>
      Effect.gen(function* () {
        const source = DocsSourcePath.make("content/start/quickstart.mdx");
        const issues = yield* validateMdxComponentPolicy(source, markdown);
        expect(issues).toHaveLength(1);
        expect(issues).toMatchObject([
          {
            message: expectedComponentMessage,
            path: [source],
          },
        ]);
      })
  );

  it.each(literalExamples)(
    "compiler policy preserves literal JSX text: %s",
    (markdown) => {
      const tree = createProcessor({ format: "mdx" }).parse(markdown);
      expect(() =>
        remarkMdxComponentPolicy()(
          tree,
          new VFile({ path: "content/start/quickstart.mdx" })
        )
      ).not.toThrow();
    }
  );

  it.each(executableExamples)(
    "compiler policy rejects executable JSX: %s",
    (markdown) => {
      const tree = createProcessor({ format: "mdx" }).parse(markdown);
      expect(() =>
        remarkMdxComponentPolicy()(
          tree,
          new VFile({ path: "content/start/quickstart.mdx" })
        )
      ).toThrow("MDX component not allowed:");
    }
  );

  it.effect.each([
    ["<motion.div />", "motion.div"],
    ["{<components.Unsafe />}", "components.Unsafe"],
    ["<components.UI.Unsafe />", "components.UI.Unsafe"],
  ] as const)(
    "reports the schema-owned member component name: %s",
    ([markdown, name]) =>
      Effect.gen(function* () {
        const source = DocsSourcePath.make("content/start/quickstart.mdx");
        expect(
          yield* validateMdxComponentPolicy(source, markdown)
        ).toMatchObject([
          { message: `MDX component not allowed: ${name}`, path: [source] },
        ]);
      })
  );

  it.effect("returns a safe authoring issue for invalid MDX syntax", () =>
    Effect.gen(function* () {
      const source = DocsSourcePath.make("content/start/quickstart.mdx");
      expect(
        yield* validateMdxComponentPolicy(source, "<UnsafeComponent")
      ).toMatchObject([
        { message: "The documentation MDX syntax is invalid.", path: [source] },
      ]);
    })
  );
});
