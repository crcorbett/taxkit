import { ReadingBody, ReadingCodeBlock } from "@taxkit/mdx/schemas";
import { Theme } from "@taxkit/mdx/theme";
import { Function as EffectFunction, Record, Schema } from "effect";

export const codeText = '\tlet chart = "<harbor>";\n\n  sail();\n';
export const escapedCodeText =
  "\tlet chart = &quot;&lt;harbor&gt;&quot;;\n\n  sail();\n";

const codeInput = {
  kind: "code",
  language: "ts",
  lines: [
    [
      {
        text: '\tlet chart = "<harbor>";',
        light: { color: "#123456", style: "bold-italic" },
        dark: { color: "#fedcba", style: "italic" },
      },
    ],
    [],
    [
      {
        text: "  sail();",
        light: { color: "#123456", style: "normal" },
        dark: { color: "#fedcba", style: "normal" },
      },
    ],
    [],
  ],
} as const;

export const code = Schema.decodeEffect(ReadingCodeBlock)(codeInput);

export const article = Schema.decodeEffect(ReadingBody)([
  {
    kind: "heading",
    depth: 1,
    id: "coastal-observations",
    content: [{ kind: "text", text: "Coastal observations" }],
  },
  {
    kind: "paragraph",
    content: [
      { kind: "text", text: '<script>alert("deck")</script> & tide' },
      {
        kind: "link",
        href: "/maps/harbor?level=2&depth=5#dock",
        content: [
          {
            kind: "strong",
            content: [{ kind: "text", text: "Harbor atlas" }],
          },
        ],
      },
    ],
  },
  {
    kind: "heading",
    depth: 2,
    id: "survey",
    content: [{ kind: "text", text: "Survey" }],
  },
  codeInput,
  {
    kind: "heading",
    depth: 3,
    id: "measurements",
    content: [{ kind: "text", text: "Measurements" }],
  },
  {
    kind: "table",
    align: ["left", "right"],
    header: [
      [{ kind: "text", text: "Station" }],
      [{ kind: "text", text: "Depth" }],
    ],
    rows: [
      [
        [{ kind: "text", text: "East buoy" }],
        [{ kind: "text", text: "12 metres" }],
      ],
    ],
  },
  {
    kind: "heading",
    depth: 4,
    id: "tidal-route",
    content: [{ kind: "text", text: "Tidal route" }],
  },
  {
    kind: "diagram",
    source: "flowchart LR\n  Vessel --> Harbor",
    title: "Tidal route and berth",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 5H10" /></svg>',
  },
]);

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
