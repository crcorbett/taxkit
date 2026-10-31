import { assert, describe, it } from "@effect/vitest";
import { MdxArtifactsLive } from "@taxkit/mdx/artifacts";
import { MdxCompilerLive } from "@taxkit/mdx/compiler";
import { PierreCodeHighlighterLive } from "@taxkit/mdx/highlights";
import { MdxLive } from "@taxkit/mdx/live";
import { MdxRendererLive } from "@taxkit/mdx/renderer";
import {
  LinkDestination,
  Source,
  SourceId,
  SourceText,
  CodeText,
  InlineText,
  LinkTarget,
  ListStart,
} from "@taxkit/mdx/schemas";
import {
  CodeHighlighter,
  DiagramRenderer,
  LinkResolver,
  MdxCompiler,
  MdxArtifacts,
  MdxRenderer,
} from "@taxkit/mdx/service";
import { DiagramRendererTest } from "@taxkit/mdx/test";
import {
  Array,
  ConfigProvider,
  Deferred,
  Effect,
  Fiber,
  Layer,
  Match,
  Option,
  Ref,
} from "effect";
import { expectTypeOf } from "vitest";

const LinksTest = Layer.succeed(
  LinkResolver,
  LinkResolver.of({
    resolve: Effect.fn("LinkResolver.resolve")((reference) =>
      LinkDestination.makeEffect(`/resolved/${reference.target}`).pipe(
        Effect.orDie
      )
    ),
  })
);
const RenderingTest = MdxRendererLive.pipe(
  Layer.provide(
    Layer.mergeAll(PierreCodeHighlighterLive, DiagramRendererTest, LinksTest)
  )
);
const PipelineTest = MdxLive.pipe(
  Layer.provide(
    Layer.mergeAll(PierreCodeHighlighterLive, DiagramRendererTest, LinksTest)
  )
);
const source = Effect.gen(function* () {
  return yield* Source.makeEffect({
    id: yield* SourceId.makeEffect("article:one"),
    text: yield* SourceText.makeEffect(
      "---\ncustom: [true, null, 12]\n---\n\n# Article\n\nRead [more](another).\n\n```ts\nconst n = 1;\n\n```"
    ),
  });
});

describe("portable MDX pipeline", () => {
  it("keeps raw primitives and distinct semantic brands out of typed operations", () => {
    expectTypeOf<string>().not.toExtend<SourceText>();
    expectTypeOf<SourceText>().not.toExtend<CodeText>();
    expectTypeOf<CodeText>().not.toExtend<InlineText>();
    expectTypeOf<SourceId>().not.toExtend<LinkTarget>();
    expectTypeOf<LinkTarget>().not.toExtend<LinkDestination>();
    expectTypeOf<number>().not.toExtend<ListStart>();
  });

  it.effect("checks brand refinements without changing literal text", () =>
    Effect.gen(function* () {
      assert.strictEqual(
        yield* SourceText.makeEffect("  source\r\n"),
        "  source\r\n"
      );
      assert.strictEqual(yield* CodeText.makeEffect("  code\n"), "  code\n");
      assert.strictEqual(yield* InlineText.makeEffect(" "), " ");
      assert.strictEqual(yield* LinkTarget.makeEffect(""), "");
      assert.strictEqual(yield* ListStart.makeEffect(1), 1);
      yield* SourceText.makeEffect("s".repeat(1_000_001)).pipe(Effect.flip);
      yield* CodeText.makeEffect("c".repeat(20_001)).pipe(Effect.flip);
      yield* InlineText.makeEffect("").pipe(Effect.flip);
      yield* LinkTarget.makeEffect("t".repeat(8193)).pipe(Effect.flip);
      yield* Effect.forEach([0, -1, 1.5], (value) =>
        ListStart.makeEffect(value).pipe(Effect.flip)
      );
    })
  );

  it.effect("rejects invalid table shapes in both artifact formats", () =>
    Effect.gen(function* () {
      const artifacts = yield* MdxArtifacts;
      yield* Effect.forEach(
        [
          '{"kind":"table","align":[],"header":[],"rows":[]}',
          '{"kind":"table","align":["left"],"header":[[]],"rows":[[]]}',
          '{"kind":"table","align":[],"header":[[]],"rows":[]}',
        ],
        (block) =>
          Effect.gen(function* () {
            const fields = `"blocks":[${block}],"metadata":null,"sourceId":"table","version":1`;
            yield* artifacts
              .decodeDocument(`{"format":"mdx-document",${fields}}`)
              .pipe(Effect.flip);
            yield* artifacts
              .decodeRenderedDocument(
                `{"format":"mdx-rendered-document",${fields}}`
              )
              .pipe(Effect.flip);
          })
      );
      const fields =
        '"blocks":[{"kind":"table","align":["left"],"header":[[]],"rows":[[[]]]}],"metadata":null,"sourceId":"table","version":1';
      yield* artifacts.decodeDocument(`{"format":"mdx-document",${fields}}`);
      yield* artifacts.decodeRenderedDocument(
        `{"format":"mdx-rendered-document",${fields}}`
      );
    }).pipe(Effect.provide(MdxArtifactsLive))
  );

  it.effect(
    "rejects rendered artifact drift and excess fields on egress without caller options",
    () =>
      Effect.gen(function* () {
        const artifacts = yield* MdxArtifacts;
        const compiler = yield* MdxCompiler;
        const renderer = yield* MdxRenderer;
        const document = yield* compiler.compile(yield* source);
        const rendered = yield* renderer.render(document);
        const bytes = yield* artifacts.encodeRenderedDocument(rendered);
        yield* Effect.forEach(
          [
            bytes.replace('"version":1', '"future":true,"version":1'),
            bytes.replace('"kind":"link"', '"future":true,"kind":"link"'),
            bytes.replace('"kind":"text"', '"future":true,"kind":"text"'),
            bytes.replace('"kind":"code"', '"future":true,"kind":"code"'),
            bytes.replace('"style":"normal"', '"future":true,"style":"normal"'),
            bytes.replace('"mdx-rendered-document"', '"mdx-document"'),
            bytes.replace('"version":1', '"version":2'),
            bytes.replace(',"href":"/resolved/another"', ""),
          ],
          (input) => {
            assert.notStrictEqual(
              input,
              bytes,
              "The rejection fixture must change the artifact."
            );
            return artifacts.decodeRenderedDocument(input).pipe(Effect.flip);
          }
        );
        const futureDocument = { ...document, future: true };
        const futureRendered = { ...rendered, future: true };
        yield* artifacts.encodeDocument(futureDocument).pipe(Effect.flip);
        yield* artifacts
          .encodeRenderedDocument(futureRendered)
          .pipe(Effect.flip);
      }).pipe(Effect.provide(PipelineTest))
  );
  it.effect(
    "compiles a content-neutral fragment without rendering providers",
    () =>
      Effect.gen(function* () {
        const compiler = yield* MdxCompiler;
        const input = yield* source;
        const document = yield* compiler.compile({
          ...input,
          text: yield* SourceText.makeEffect("A fragment."),
        });
        assert.isTrue(Option.isNone(document.metadata));
        assert.deepEqual<unknown>(document.blocks, [
          {
            content: [{ kind: "text", text: "A fragment." }],
            kind: "paragraph",
          },
        ]);
      }).pipe(Effect.provide(MdxCompilerLive))
  );

  it.effect(
    "round-trips a checked artifact and renders without a compiler",
    () =>
      Effect.gen(function* () {
        const artifacts = yield* MdxArtifacts;
        const input = yield* source;
        const compiler = yield* MdxCompiler.pipe(
          Effect.provide(MdxCompilerLive)
        );
        const document = yield* compiler.compile(input);
        const bytes = yield* artifacts.encodeDocument(document);
        const stored = yield* artifacts.decodeDocument(bytes);
        assert.deepEqual(stored, document);
        const renderer = yield* MdxRenderer.pipe(Effect.provide(RenderingTest));
        const rendered = yield* renderer.render(stored);
        const encoded = yield* artifacts.encodeRenderedDocument(rendered);
        assert.deepEqual(
          yield* artifacts.decodeRenderedDocument(encoded),
          rendered
        );
        const [heading, paragraph, code] = rendered.blocks;
        assert.strictEqual(heading?.kind, "heading");
        assert.deepEqual<unknown>(
          Match.value(paragraph).pipe(
            Match.when({ kind: "paragraph" }, (block) =>
              Array.get(block.content, 1)
            ),
            Match.orElse(() => Option.none()),
            Option.getOrUndefined
          ),
          {
            content: [{ kind: "text", text: "more" }],
            href: "/resolved/another",
            kind: "link",
            target: "another",
          }
        );
        assert.strictEqual(
          Match.value(code).pipe(
            Match.when({ kind: "code" }, (block) => Option.some(block.text)),
            Match.orElse(() => Option.none()),
            Option.getOrUndefined
          ),
          "const n = 1;\n"
        );
      }).pipe(Effect.provide(MdxArtifactsLive))
  );

  it.effect("normalises LF and CRLF into the same semantic document", () =>
    Effect.gen(function* () {
      const compiler = yield* MdxCompiler;
      const input = yield* source;
      assert.deepEqual(
        yield* compiler.compile(input),
        yield* compiler.compile({
          ...input,
          text: yield* SourceText.makeEffect(
            input.text.replaceAll("\n", "\r\n")
          ),
        })
      );
    }).pipe(Effect.provide(MdxCompilerLive))
  );

  it.effect("rejects unsafe or unsupported source without evaluation", () =>
    Effect.gen(function* () {
      const compiler = yield* MdxCompiler;
      const input = yield* source;
      yield* Effect.forEach(
        [
          "---\nx: .inf\n---\nText",
          "---\nx: 1\nx: 2\n---\nText",
          "---\nx: &a 1\ny: *a\n---\nText",
          "---\n- item\n---\nText",
          "---\nx: !custom value\n---\nText",
          '<Callout tone="note" tone="warning" />',
          '<Callout tone={"note"} />',
          "{await fetch('https://example.com')}",
          "export const x = 1",
          "## Twice\n\n## Twice",
        ],
        (text) =>
          SourceText.makeEffect(text).pipe(
            Effect.orDie,
            Effect.flatMap((checked) =>
              compiler.compile({ ...input, text: checked })
            ),
            Effect.flip,
            Effect.tap((error) =>
              Effect.sync(() => {
                assert.strictEqual(error._tag, "CompileError");
              })
            )
          )
      );
      const fenced = yield* compiler.compile({
        ...input,
        text: yield* SourceText.makeEffect(
          '```txt\n<Callout tone={"note"} />\n```'
        ),
      });
      assert.strictEqual(
        Option.map(Array.head(fenced.blocks), (block) => block.kind).pipe(
          Option.getOrUndefined
        ),
        "code"
      );
    }).pipe(Effect.provide(MdxCompilerLive))
  );

  it.effect(
    "rejects wrong artifact kinds, versions and unexpected fields",
    () =>
      Effect.gen(function* () {
        const artifacts = yield* MdxArtifacts;
        const compiler = yield* MdxCompiler;
        const document = yield* compiler.compile(yield* source);
        const encoded = yield* artifacts.encodeDocument(document);
        yield* Effect.forEach(
          [
            encoded.replace('"version":1', '"version":999'),
            encoded.replace('"mdx-document"', '"mdx-rendered-document"'),
            encoded.replace('"version":1', '"future":true,"version":1'),
            encoded.replace('"kind":"code"', '"future":true,"kind":"code"'),
            encoded.replace('"kind":"text"', '"future":true,"kind":"text"'),
          ],
          (text) => artifacts.decodeDocument(text).pipe(Effect.flip)
        );
      }).pipe(Effect.provide(Layer.merge(MdxCompilerLive, MdxArtifactsLive)))
  );

  it.effect(
    "changes presentation with checked Config while retaining document semantics",
    () =>
      Effect.gen(function* () {
        const compiler = yield* MdxCompiler.pipe(
          Effect.provide(MdxCompilerLive)
        );
        const document = yield* compiler.compile(yield* source);
        const light = yield* MdxRenderer.pipe(Effect.provide(RenderingTest));
        const dark = yield* MdxRenderer.pipe(
          Effect.provide(
            RenderingTest.pipe(
              Layer.provide(
                ConfigProvider.layer(
                  ConfigProvider.fromUnknown({ MDX_THEME: "dark" })
                )
              )
            )
          )
        );
        const a = yield* light.render(document);
        const b = yield* dark.render(document);
        const codeA = Array.findFirst(
          a.blocks,
          (block) => block.kind === "code"
        );
        const codeB = Array.findFirst(
          b.blocks,
          (block) => block.kind === "code"
        );
        assert.notDeepEqual(codeA, codeB);
        assert.deepEqual(yield* compiler.compile(yield* source), document);
      })
  );

  it.effect("rejects token corruption with a bounded node diagnostic", () =>
    Effect.gen(function* () {
      const compiler = yield* MdxCompiler;
      const renderer = yield* MdxRenderer;
      const document = yield* compiler.compile(yield* source);
      const error = yield* renderer.render(document).pipe(Effect.flip);
      assert.strictEqual(error.reason, "code-tokens");
      assert.deepEqual(error.node, [2]);
    }).pipe(
      Effect.provide(
        MdxLive.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(
                CodeHighlighter,
                CodeHighlighter.of({
                  highlight: Effect.fn("CodeHighlighter.highlight")(() =>
                    Effect.succeed([[]])
                  ),
                })
              ),
              DiagramRendererTest,
              LinksTest
            )
          )
        )
      )
    )
  );

  it.effect(
    "interrupts between providers without running later work or publishing success",
    () =>
      Effect.gen(function* () {
        const started = yield* Deferred.make<boolean>();
        const later = yield* Ref.make(0);
        const published = yield* Ref.make(false);
        const compiler = yield* MdxCompiler.pipe(
          Effect.provide(MdxCompilerLive)
        );
        const input = yield* source;
        const document = yield* compiler.compile({
          ...input,
          text: yield* SourceText.makeEffect(
            '```ts\nconst n = 1;\n```\n\n```mermaid title="Steps"\ngraph LR\nA --> B\n```'
          ),
        });
        const renderer = yield* MdxRenderer.pipe(
          Effect.provide(
            MdxRendererLive.pipe(
              Layer.provide(
                Layer.mergeAll(
                  LinksTest,
                  Layer.succeed(
                    CodeHighlighter,
                    CodeHighlighter.of({
                      highlight: Effect.fn("CodeHighlighter.highlight")(
                        function* () {
                          yield* Deferred.succeed(started, true);
                          return yield* Effect.never;
                        }
                      ),
                    })
                  ),
                  Layer.succeed(
                    DiagramRenderer,
                    DiagramRenderer.of({
                      render: Effect.fn("DiagramRenderer.render")(() =>
                        Ref.update(later, (value) => value + 1).pipe(
                          Effect.andThen(Effect.never)
                        )
                      ),
                    })
                  )
                )
              )
            )
          )
        );
        const fiber = yield* renderer.render(document).pipe(
          Effect.tap(() => Ref.set(published, true)),
          Effect.forkScoped
        );
        yield* Deferred.await(started);
        yield* Fiber.interrupt(fiber);
        assert.strictEqual(yield* Ref.get(later), 0);
        assert.isFalse(yield* Ref.get(published));
      }).pipe(Effect.scoped)
  );

  it.effect(
    "shares provider acquisition within a scope and releases it before the next scope",
    () =>
      Effect.gen(function* () {
        const acquisitions = yield* Ref.make(0);
        const releases = yield* Ref.make(0);
        const CountedHighlighter = Layer.effect(
          CodeHighlighter,
          Effect.acquireRelease(
            Ref.update(acquisitions, (count) => count + 1).pipe(
              Effect.as(
                CodeHighlighter.of({
                  highlight: Effect.fn("CodeHighlighter.highlight")(() =>
                    Effect.succeed([[]])
                  ),
                })
              )
            ),
            () => Ref.update(releases, (count) => count + 1)
          )
        );
        const program = Effect.gen(function* () {
          const compiler = yield* MdxCompiler;
          const renderer = yield* MdxRenderer;
          const input = yield* source;
          const document = yield* compiler.compile({
            ...input,
            text: yield* SourceText.makeEffect("A fragment."),
          });
          yield* renderer.render(document);
          yield* renderer.render(document);
        }).pipe(
          Effect.provide(
            MdxLive.pipe(
              Layer.provide(
                Layer.mergeAll(
                  CountedHighlighter,
                  DiagramRendererTest,
                  LinksTest
                )
              )
            )
          )
        );
        yield* program;
        assert.strictEqual(yield* Ref.get(acquisitions), 1);
        assert.strictEqual(yield* Ref.get(releases), 1);
        yield* program;
        assert.strictEqual(yield* Ref.get(acquisitions), 2);
        assert.strictEqual(yield* Ref.get(releases), 2);
      })
  );

  it.effect("runs the complete pipeline through one static composition", () =>
    Effect.gen(function* () {
      const compiler = yield* MdxCompiler;
      const renderer = yield* MdxRenderer;
      const result = yield* renderer.render(
        yield* compiler.compile(yield* source)
      );
      assert.strictEqual(result.format, "mdx-rendered-document");
    }).pipe(Effect.provide(PipelineTest))
  );
});
