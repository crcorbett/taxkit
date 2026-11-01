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
