import type {
  SourceText,
  CodeText,
  InlineText,
  SourceId,
  LinkTarget,
  LinkDestination,
  ListStart,
  ReadingBlock,
  ReadingBody,
  ReadingInline,
  RenderedBlock,
  RenderedInline,
  RenderedDocument,
} from "@taxkit/mdx/schemas";
import { expectTypeOf } from "vitest";

expectTypeOf<string>().not.toExtend<SourceText>();
expectTypeOf<SourceText>().not.toExtend<CodeText>();
expectTypeOf<CodeText>().not.toExtend<InlineText>();
expectTypeOf<SourceId>().not.toExtend<LinkTarget>();
expectTypeOf<LinkTarget>().not.toExtend<LinkDestination>();
expectTypeOf<number>().not.toExtend<ListStart>();
expectTypeOf<RenderedDocument["blocks"]>().toExtend<ReadingBody>();
expectTypeOf<Extract<ReadingBlock, { kind: "code" }>>().not.toHaveProperty(
  "text"
);
expectTypeOf<Extract<ReadingInline, { kind: "link" }>>().not.toHaveProperty(
  "target"
);
expectTypeOf<Extract<RenderedBlock, { kind: "code" }>>().toHaveProperty("text");
expectTypeOf<Extract<RenderedInline, { kind: "link" }>>().toHaveProperty(
  "target"
);
