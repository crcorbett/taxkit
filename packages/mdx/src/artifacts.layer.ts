import { Effect, Layer, Schema } from "effect";

import { Document, RenderedDocument } from "./schemas.js";
import { MdxArtifacts } from "./service.js";
import { Theme } from "./theme.schemas.js";

// Effect 4 parse options belong to the parser, not schema annotations. Keep
// codecs private and expose operations without a caller-overridable options bag.
const DocumentJson = Schema.fromJsonString(Document);
const RenderedDocumentJson = Schema.fromJsonString(RenderedDocument);
const ThemeJson = Schema.fromJsonString(Theme);
const strict = { onExcessProperty: "error" } as const;

export const MdxArtifactsLive = Layer.succeed(
  MdxArtifacts,
  MdxArtifacts.of({
    decodeTheme: Effect.fn("MdxArtifacts.decodeTheme")((input) =>
      Schema.decodeEffect(ThemeJson, strict)(input)
    ),
    encodeTheme: Effect.fn("MdxArtifacts.encodeTheme")((theme) =>
      Schema.encodeEffect(ThemeJson, strict)(theme)
    ),
    decodeDocument: Effect.fn("MdxArtifacts.decodeDocument")((input) =>
      Schema.decodeEffect(DocumentJson, strict)(input)
    ),
    decodeRenderedDocument: Effect.fn("MdxArtifacts.decodeRenderedDocument")(
      (input) => Schema.decodeEffect(RenderedDocumentJson, strict)(input)
    ),
    encodeDocument: Effect.fn("MdxArtifacts.encodeDocument")((document) =>
      Schema.encodeEffect(DocumentJson, strict)(document)
    ),
    encodeRenderedDocument: Effect.fn("MdxArtifacts.encodeRenderedDocument")(
      (document) => Schema.encodeEffect(RenderedDocumentJson, strict)(document)
    ),
  })
);
