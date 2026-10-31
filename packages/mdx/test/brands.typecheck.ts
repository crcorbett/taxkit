import type {
  SourceText,
  CodeText,
  InlineText,
  SourceId,
  LinkTarget,
  LinkDestination,
  ListStart,
} from "@taxkit/mdx/schemas";
import { expectTypeOf } from "vitest";

expectTypeOf<string>().not.toExtend<SourceText>();
expectTypeOf<SourceText>().not.toExtend<CodeText>();
expectTypeOf<CodeText>().not.toExtend<InlineText>();
expectTypeOf<SourceId>().not.toExtend<LinkTarget>();
expectTypeOf<LinkTarget>().not.toExtend<LinkDestination>();
expectTypeOf<number>().not.toExtend<ListStart>();
