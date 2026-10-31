import { Schema } from "effect";

import { CodeLanguage, SourceId } from "./schemas.js";

export const CompileReason = Schema.Literals([
  "frontmatter",
  "syntax",
  "code-language",
  "code-metadata",
  "diagram-title",
  "diagram-source",
  "heading",
  "body",
]);
export class CompileError extends Schema.TaggedError<
  CompileError,
  { readonly brand: unique symbol }
>()("CompileError", {
  message: Schema.String,
  reason: CompileReason,
  source: SourceId,
}) {}
export class RenderError extends Schema.TaggedError<
  RenderError,
  { readonly brand: unique symbol }
>()("RenderError", {
  message: Schema.String,
  node: Schema.Array(Schema.Int),
  reason: Schema.Literals([
    "link",
    "code-highlight",
    "code-tokens",
    "diagram-render",
    "diagram-svg",
  ]),
  source: SourceId,
}) {}
export class LinkResolveError extends Schema.TaggedError<
  LinkResolveError,
  { readonly brand: unique symbol }
>()("LinkResolveError", { reason: Schema.Literal("link") }) {}
// The highlighter refused the code or returned tokens that do not satisfy the MDX contract.
// No source text or provider cause is kept.
export class CodeHighlightError extends Schema.TaggedError<
  CodeHighlightError,
  { readonly brand: unique symbol }
>()("CodeHighlightError", {
  language: CodeLanguage,
  reason: Schema.Literals(["highlight", "tokens"]),
}) {}

// The diagram renderer refused the Mermaid source or returned an unusable SVG.
export class DiagramRenderError extends Schema.TaggedError<
  DiagramRenderError,
  { readonly brand: unique symbol }
>()("DiagramRenderError", { reason: Schema.Literals(["render", "svg"]) }) {}
