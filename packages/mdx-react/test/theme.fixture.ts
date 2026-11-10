import { Theme } from "@taxkit/mdx/theme";
import { Function as EffectFunction, Record, Schema } from "effect";

// Colour owner for the presenter fixtures: the paired code colours and a
// complete journal theme decoded through the neutral Theme Schema.
export const codeColours = { dark: "#fedcba", light: "#123456" } as const;

const tokenAppearance = { color: "#5a3b11", style: "normal" } as const;
const syntax = {
  comment: tokenAppearance,
  constant: tokenAppearance,
  function: tokenAppearance,
  keyword: tokenAppearance,
  number: tokenAppearance,
  operator: tokenAppearance,
  property: tokenAppearance,
  punctuation: tokenAppearance,
  string: tokenAppearance,
  type: tokenAppearance,
  variable: tokenAppearance,
};

export const journalTheme = Schema.decodeEffect(Theme)({
  typography: {
    text: { names: ["Literata"], fallback: "serif" },
    code: { names: ["Iosevka"], fallback: "monospace" },
    diagramSize: 16,
  },
  light: {
    palette: {
      background: "#f5f0e8",
      foreground: "#2d241d",
      muted: "#6b5c4d",
      surface: "#fffaf2",
      surfaceAlt: "#e8dece",
      border: "#c0ac96",
      accent: "#6d3f8d",
      critical: "#b32a24",
    },
    syntax,
    series: [
      "#112233",
      "#223344",
      "#334455",
      "#445566",
      "#556677",
      "#667788",
      "#778899",
      "#8899aa",
    ],
  },
  dark: {
    palette: {
      background: "#18120d",
      foreground: "#f6eadc",
      muted: "#c9b299",
      surface: "#241a12",
      surfaceAlt: "#33251a",
      border: "#715741",
      accent: "#d6a1ff",
      critical: "#ff9c96",
    },
    syntax: EffectFunction.pipe(
      syntax,
      Record.map((appearance) => ({ ...appearance, color: "#ffe4a8" }))
    ),
    series: [
      "#112233",
      "#223344",
      "#334455",
      "#445566",
      "#556677",
      "#667788",
      "#778899",
      "#8899aa",
    ],
  },
});
