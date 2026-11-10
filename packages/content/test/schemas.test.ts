import { assert, describe, it } from "@effect/vitest";
import { ReadingBody } from "@taxkit/mdx/schemas";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Result,
  Schema,
} from "effect";

import { exampleContentCatalogue } from "../src/__testing__/fixtures.js";
import {
  DocsPublicCatalogue,
  DocsPublicPage,
  DocsReadingBody,
  DocsSearchTerm,
} from "../src/schemas.js";
import { readingV2Json } from "./fixtures/reading-v2.js";
import { codeColours } from "./theme.fixture.js";

describe("published reading contract", () => {
  it.effect("preserves historical v2 bytes across every reading node", () =>
    Effect.gen(function* () {
      const codec = Schema.fromJsonString(DocsReadingBody);
      const body = yield* Schema.decodeEffect(codec)(readingV2Json);
      assert.strictEqual(
        yield* Schema.encodeEffect(codec)(body),
        readingV2Json
      );
      // Content adds policy and brands without copying or rebranding the body
      // before a content-neutral presenter can consume it.
      const neutral: ReadingBody = body;
      assert.deepEqual(
        yield* Schema.encodeEffect(ReadingBody)(neutral),
        yield* Schema.encodeEffect(DocsReadingBody)(body)
      );
    })
  );

  it.effect(
    "retains narrower publication rules over the neutral reading model",
    () =>
      Effect.forEach(
        [
          [],
          [
            {
              content: [{ kind: "text", text: "Title" }],
              depth: 1,
              id: "title",
              kind: "heading",
            },
          ],
          [
            {
              content: [{ kind: "text", text: "Title" }],
              depth: 2,
              id: "Title.main",
              kind: "heading",
            },
          ],
          [
            {
              content: [
                {
                  content: [{ kind: "text", text: "Next" }],
                  href: "../next.md",
                  kind: "link",
                },
              ],
              kind: "paragraph",
            },
          ],
        ],
        (input) =>
          Effect.gen(function* () {
            yield* Schema.decodeUnknownEffect(ReadingBody)(input);
            yield* Schema.decodeUnknownEffect(DocsReadingBody)(input).pipe(
              Effect.flip
            );
          })
      )
  );

  it.effect(
    "retains table, heading and token checks at published ingress",
    () =>
      Effect.forEach(
        [
          [
            {
              content: [{ kind: "text", text: "One" }],
              depth: 2,
              id: "same",
              kind: "heading",
            },
            {
              content: [{ kind: "text", text: "Two" }],
              depth: 3,
              id: "same",
              kind: "heading",
            },
          ],
          [{ align: [], header: [[]], kind: "table", rows: [] }],
          [{ align: ["left"], header: [[]], kind: "table", rows: [[]] }],
          [{ align: [], header: [], kind: "table", rows: [] }],
          [{ kind: "code", language: "ts", lines: [] }],
          [
            {
              kind: "code",
              language: "ts",
              lines: [
                [
                  {
                    light: { color: codeColours.light, style: "normal" },
                    dark: { color: codeColours.dark, style: "normal" },
                    text: "",
                  },
                ],
              ],
            },
          ],
          [
            {
              kind: "diagram",
              source: "flowchart LR\n  A --> B",
              svg: "<div></div>",
              title: "Two steps",
            },
          ],
        ],
        (input) =>
          Effect.gen(function* () {
            yield* Schema.decodeUnknownEffect(ReadingBody)(input).pipe(
              Effect.flip
            );
            yield* Schema.decodeUnknownEffect(DocsReadingBody)(input).pipe(
              Effect.flip
            );
          })
      )
  );
});

describe("public catalogue ingress", () => {
  it.effect("round-trips the one accepted wire version", () =>
    Effect.gen(function* () {
      const catalogue = yield* exampleContentCatalogue;
      const wire = yield* Schema.encodeEffect(DocsPublicCatalogue)(catalogue);
      assert.deepEqual(
        yield* Schema.decodeUnknownEffect(DocsPublicCatalogue)(wire),
        catalogue
      );
    })
  );
  it.effect(
    "rejects drafts, mismatched addresses and unrelated source files",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        yield* EffectFunction.pipe(
          catalogue.pages,
          Effect.forEach((page) =>
            Effect.forEach(
              [
                {
                  ...page,
                  frontmatter: { ...page.frontmatter, status: "draft" },
                },
                { ...page, path: "/other/page" },
                { ...page, path: "/start/../overview" },
                { ...page, source: "private/person.mdx" },
                { ...page, slugs: [] },
              ],
              (raw) =>
                Schema.decodeUnknownEffect(DocsPublicPage)(raw).pipe(
                  Effect.result,
                  Effect.tap((result) =>
                    Effect.sync(() => {
                      assert.isTrue(Result.isFailure(result));
                    })
                  )
                )
            )
          )
        );
      })
  );
  it.effect(
    "rejects duplicate pages, stray navigation, wrong titles and unknown versions",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        yield* Effect.forEach(
          [
            { ...catalogue, pages: [...catalogue.pages, ...catalogue.pages] },
            { ...catalogue, navigation: { primaryNavigation: [] } },
            { ...catalogue, pages: [] },
            {
              ...catalogue,
              navigation: {
                primaryNavigation: [
                  ...catalogue.navigation.primaryNavigation,
                  ...catalogue.navigation.primaryNavigation,
                ],
              },
            },
            {
              ...catalogue,
              navigation: {
                primaryNavigation: EffectFunction.pipe(
                  catalogue.navigation.primaryNavigation,
                  Array.map((item) => ({ ...item, title: "Wrong title" }))
                ),
              },
            },
            { ...catalogue, schemaVersion: 1 },
          ],
          (raw) =>
            Schema.decodeUnknownEffect(DocsPublicCatalogue)(raw).pipe(
              Effect.result,
              Effect.tap((result) =>
                Effect.sync(() => {
                  assert.isTrue(Result.isFailure(result));
                })
              )
            )
        );
      })
  );
  it.effect(
    "requires a nonempty, trimmed search term of at most 100 characters",
    () =>
      Effect.gen(function* () {
        yield* Effect.forEach(["", " ", " term ", "x".repeat(101)], (raw) =>
          DocsSearchTerm.makeEffect(raw).pipe(
            Effect.result,
            Effect.tap((result) =>
              Effect.sync(() => {
                assert.isTrue(Result.isFailure(result));
              })
            )
          )
        );
      })
  );
});
