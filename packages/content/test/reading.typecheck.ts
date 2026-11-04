import type {
  DiagramSource,
  DiagramSvg,
  DiagramTitle,
  HeadingId,
  LinkDestination,
  ReadingBody,
} from "@taxkit/mdx/schemas";
import { expectTypeOf } from "vitest";

import type {
  DocsDiagramSource,
  DocsDiagramSvg,
  DocsDiagramTitle,
  DocsHeadingId,
  DocsLinkHref,
  DocsReadingBody,
} from "../src/schemas.js";

expectTypeOf<DocsReadingBody>().toExtend<ReadingBody>();
expectTypeOf<ReadingBody>().not.toExtend<DocsReadingBody>();
expectTypeOf<DocsHeadingId>().toExtend<HeadingId>();
expectTypeOf<DocsLinkHref>().toExtend<LinkDestination>();
expectTypeOf<DocsDiagramSource>().toExtend<DiagramSource>();
expectTypeOf<DocsDiagramSvg>().toExtend<DiagramSvg>();
expectTypeOf<DocsDiagramTitle>().toExtend<DiagramTitle>();
expectTypeOf<HeadingId>().not.toExtend<DocsHeadingId>();
expectTypeOf<LinkDestination>().not.toExtend<DocsLinkHref>();
