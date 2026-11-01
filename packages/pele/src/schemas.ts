import { Schema } from "effect";

// Pele's default source and output limits. Preserve authored whitespace.
export const Source = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(50_000)
).pipe(Schema.brand("taxkit/pele/Source"));
export type Source = typeof Source.Type;

export const Svg = Schema.String.check(
  Schema.isMaxLength(4_000_000),
  Schema.isPattern(
    /^<svg\s[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*>[\s\S]*<\/svg>\s*$/u
  )
).pipe(Schema.brand("taxkit/pele/Svg"));
export type Svg = typeof Svg.Type;

// A bounded serialized CSS font stack: quoted names and one generic fallback.
export const FontFamily = Schema.Trimmed.check(
  Schema.isMaxLength(600),
  Schema.isPattern(
    /^(?:"[\p{L}\p{N}][\p{L}\p{N} _-]{0,63}",)*(?:serif|sans-serif|monospace)$/u
  )
).pipe(Schema.brand("taxkit/pele/FontFamily"));
export const FontSizePx = Schema.Finite.check(
  Schema.isBetween({ minimum: 8, maximum: 48 })
).pipe(Schema.brand("taxkit/pele/FontSizePx"));
export const Typography = Schema.Struct({
  fontFamily: FontFamily,
  fontFamilyMono: FontFamily,
  fontSize: FontSizePx,
});
export const RenderSvgRequest = Schema.Struct({
  source: Source,
  typography: Schema.OptionFromOptional(Typography),
});
export type RenderSvgRequest = typeof RenderSvgRequest.Type;
