import { Context } from "effect";
import type { Effect, Schema } from "effect";

import type {
  CompileError,
  RenderError,
  CodeHighlightError,
  DiagramRenderError,
  LinkResolveError,
} from "./errors.js";
import type {
  Source,
  LinkReference,
  LinkDestination,
  Document,
  RenderedDocument,
  CodeLines,
  DiagramSvg,
  RenderRequest,
  CodeHighlightRequest,
  DiagramRenderRequest,
} from "./schemas.js";
import type { Theme } from "./theme.schemas.js";

export class MdxCompiler extends Context.Service<
  MdxCompiler,
  {
    readonly compile: (source: Source) => Effect.Effect<Document, CompileError>;
  }
>()("@taxkit/mdx/MdxCompiler") {}
export class MdxRenderer extends Context.Service<
  MdxRenderer,
  {
    readonly render: (
      request: RenderRequest
    ) => Effect.Effect<RenderedDocument, RenderError>;
  }
>()("@taxkit/mdx/MdxRenderer") {}
// Persistence owns strict representation checks without acquiring parser or render providers.
export class MdxArtifacts extends Context.Service<
  MdxArtifacts,
  {
    readonly decodeTheme: (
      json: string
    ) => Effect.Effect<Theme, Schema.SchemaError>;
    readonly encodeTheme: (
      theme: Theme
    ) => Effect.Effect<string, Schema.SchemaError>;
    readonly decodeDocument: (
      json: string
    ) => Effect.Effect<Document, Schema.SchemaError>;
    readonly encodeDocument: (
      document: Document
    ) => Effect.Effect<string, Schema.SchemaError>;
    readonly decodeRenderedDocument: (
      json: string
    ) => Effect.Effect<RenderedDocument, Schema.SchemaError>;
    readonly encodeRenderedDocument: (
      document: RenderedDocument
    ) => Effect.Effect<string, Schema.SchemaError>;
  }
>()("@taxkit/mdx/MdxArtifacts") {}

export class CodeHighlighter extends Context.Service<
  CodeHighlighter,
  {
    readonly highlight: (
      request: CodeHighlightRequest
    ) => Effect.Effect<CodeLines, CodeHighlightError>;
  }
>()("@taxkit/mdx/CodeHighlighter") {}
export class DiagramRenderer extends Context.Service<
  DiagramRenderer,
  {
    readonly render: (
      request: DiagramRenderRequest
    ) => Effect.Effect<DiagramSvg, DiagramRenderError>;
  }
>()("@taxkit/mdx/DiagramRenderer") {}
export class LinkResolver extends Context.Service<
  LinkResolver,
  {
    readonly resolve: (
      reference: LinkReference
    ) => Effect.Effect<LinkDestination, LinkResolveError>;
  }
>()("@taxkit/mdx/LinkResolver") {}
