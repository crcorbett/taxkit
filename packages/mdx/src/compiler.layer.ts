import { Effect, Layer } from "effect";

import { compileBlocks } from "./body.ingress.js";
import { parseSource } from "./mdx.ingress.js";
import { MdxCompiler } from "./service.js";

export const MdxCompilerLive = Layer.succeed(
  MdxCompiler,
  MdxCompiler.of({
    compile: Effect.fn("MdxCompiler.compile")(function* (source) {
      const { metadata, root } = yield* parseSource(source);
      const blocks = yield* compileBlocks(root.children, source.id);
      return {
        blocks,
        format: "mdx-document" as const,
        metadata,
        sourceId: source.id,
        version: 1 as const,
      };
    }),
  })
);
