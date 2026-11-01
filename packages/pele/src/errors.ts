import { Schema } from "effect";

export class PeleRenderError extends Schema.TaggedError<
  PeleRenderError,
  { readonly brand: unique symbol }
>()("PeleRenderError", {
  reason: Schema.Literals([
    "unsupported-diagram",
    "syntax",
    "semantic",
    "limit",
    "render",
    "output",
  ]),
}) {}
