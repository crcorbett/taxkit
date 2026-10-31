import { Function as EffectFunction, Effect, Layer, Match } from "effect";

import { RenderError } from "./errors.js";
import { RenderedBlock, RenderedLink } from "./schemas.js";
import type { Block, Document, Inline, RenderedInline } from "./schemas.js";
import {
  CodeHighlighter,
  DiagramRenderer,
  LinkResolver,
  MdxRenderer,
} from "./service.js";

export const MdxRendererLive = Layer.effect(
  MdxRenderer,
  Effect.gen(function* () {
    const highlighter = yield* CodeHighlighter;
    const diagrams = yield* DiagramRenderer;
    const links = yield* LinkResolver;
    const renderInline = (
      inline: Inline,
      document: Document,
      node: readonly number[]
    ): Effect.Effect<RenderedInline, RenderError> =>
      Match.value(inline).pipe(
        Match.when({ kind: "link" }, (link) =>
          links
            .resolve({ sourceId: document.sourceId, target: link.target })
            .pipe(
              Effect.flatMap((href) =>
                RenderedLink.makeEffect({ ...link, href })
              ),
              Effect.mapError(
                () =>
                  new RenderError({
                    message: "The link could not be resolved.",
                    node,
                    reason: "link",
                    source: document.sourceId,
                  })
              )
            )
        ),
        Match.orElse((value) => Effect.succeed(value))
      );
    const renderInlines = (
      inlines: readonly Inline[],
      document: Document,
      node: readonly number[]
    ) =>
      EffectFunction.pipe(
        inlines,
        Effect.forEach((inline, index) =>
          renderInline(inline, document, [...node, index])
        )
      );
    const renderBlock = (
      input: Block,
      document: Document,
      node: readonly number[]
    ): Effect.Effect<RenderedBlock, RenderError> => {
      const fail = (reason: RenderError["reason"]) =>
        new RenderError({
          message: "The block could not be rendered.",
          node,
          reason,
          source: document.sourceId,
        });
      return Match.value(input).pipe(
        Match.discriminatorsExhaustive("kind")({
          code: (block) =>
            highlighter
              .highlight({ language: block.language, text: block.text })
              .pipe(
                Effect.mapError((error) =>
                  Match.value(error.reason).pipe(
                    Match.when("highlight", () => fail("code-highlight")),
                    Match.when("tokens", () => fail("code-tokens")),
                    Match.exhaustive
                  )
                ),
                Effect.flatMap((lines) =>
                  RenderedBlock.makeEffect({ ...block, lines }).pipe(
                    Effect.mapError(() => fail("code-tokens"))
                  )
                )
              ),
          diagram: (block) =>
            diagrams.render(block.source).pipe(
              Effect.mapError((error) =>
                Match.value(error.reason).pipe(
                  Match.when("render", () => fail("diagram-render")),
                  Match.when("svg", () => fail("diagram-svg")),
                  Match.exhaustive
                )
              ),
              Effect.flatMap((svg) =>
                RenderedBlock.makeEffect({ ...block, svg }).pipe(
                  Effect.mapError(() => fail("diagram-svg"))
                )
              )
            ),
          heading: (block) =>
            renderInlines(block.content, document, node).pipe(
              Effect.map((content) => ({ ...block, content }))
            ),
          list: (block) =>
            EffectFunction.pipe(
              block.items,
              Effect.forEach((item, index) =>
                renderInlines(item, document, [...node, index])
              ),
              Effect.map((items) => ({ ...block, items }))
            ),
          paragraph: (block) =>
            renderInlines(block.content, document, node).pipe(
              Effect.map((content) => ({ ...block, content }))
            ),
          table: (block) =>
            Effect.gen(function* () {
              const header = yield* EffectFunction.pipe(
                block.header,
                Effect.forEach((cell, index) =>
                  renderInlines(cell, document, [...node, 0, index])
                )
              );
              const rows = yield* EffectFunction.pipe(
                block.rows,
                Effect.forEach((row, index) =>
                  EffectFunction.pipe(
                    row,
                    Effect.forEach((cell, col) =>
                      renderInlines(cell, document, [...node, index + 1, col])
                    )
                  )
                )
              );
              return { ...block, header, rows };
            }),
        })
      );
    };
    return MdxRenderer.of({
      render: Effect.fn("MdxRenderer.render")(function* (document) {
        const blocks = yield* EffectFunction.pipe(
          document.blocks,
          Effect.forEach((block, index) =>
            renderBlock(block, document, [index])
          )
        );
        return {
          ...document,
          blocks,
          format: "mdx-rendered-document" as const,
        };
      }),
    });
  })
);
