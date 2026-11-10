import { ReadingBody, ReadingCodeBlock } from "@taxkit/mdx/schemas";
import { Schema } from "effect";

import { codeColours } from "./theme.fixture.js";

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
        light: { color: codeColours.light, style: "bold-italic" },
        dark: { color: codeColours.dark, style: "italic" },
      },
    ],
    [],
    [
      {
        text: "  sail();",
        light: { color: codeColours.light, style: "normal" },
        dark: { color: codeColours.dark, style: "normal" },
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
