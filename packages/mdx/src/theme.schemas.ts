import { Schema } from "effect";

export const Color = Schema.Trimmed.check(
  Schema.isPattern(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/u)
)
  .pipe(Schema.brand("taxkit/mdx/Color"))
  .annotate({ identifier: "MdxColor" });
export type Color = typeof Color.Type;
export const TokenStyle = Schema.Literals([
  "normal",
  "italic",
  "bold",
  "bold-italic",
]);
export const TokenAppearance = Schema.Struct({
  color: Color,
  style: TokenStyle,
}).annotate({ identifier: "MdxTokenAppearance" });
export type TokenAppearance = typeof TokenAppearance.Type;
export const ColorRole = Schema.Literals([
  "background",
  "foreground",
  "muted",
  "surface",
  "surfaceAlt",
  "border",
  "accent",
  "critical",
]);
export const SyntaxRole = Schema.Literals([
  "comment",
  "keyword",
  "string",
  "number",
  "constant",
  "function",
  "type",
  "variable",
  "property",
  "operator",
  "punctuation",
]);
export const Scheme = Schema.Struct({
  palette: Schema.Record(ColorRole, Color),
  syntax: Schema.Record(SyntaxRole, TokenAppearance),
  series: Schema.Array(Color).check(
    Schema.isMinLength(8),
    Schema.isMaxLength(8)
  ),
}).annotate({ identifier: "MdxScheme" });
export type Scheme = typeof Scheme.Type;
export const FontName = Schema.Trimmed.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u)
)
  .pipe(Schema.brand("taxkit/mdx/FontName"))
  .annotate({ identifier: "MdxFontName" });
export const FontStack = Schema.Struct({
  names: Schema.Array(FontName).check(Schema.isMaxLength(8)),
  fallback: Schema.Literals(["serif", "sans-serif", "monospace"]),
}).annotate({ identifier: "MdxFontStack" });
export type FontStack = typeof FontStack.Type;
export const FontSizePx = Schema.Finite.check(
  Schema.isBetween({ minimum: 8, maximum: 48 })
)
  .pipe(Schema.brand("taxkit/mdx/FontSizePx"))
  .annotate({ identifier: "MdxFontSizePx" });
export const Typography = Schema.Struct({
  text: FontStack,
  code: FontStack,
  diagramSize: FontSizePx,
}).annotate({ identifier: "MdxTypography" });
export const Theme = Schema.Struct({
  typography: Typography,
  light: Scheme,
  dark: Scheme,
}).annotate({ identifier: "MdxTheme" });
export type Theme = typeof Theme.Type;
