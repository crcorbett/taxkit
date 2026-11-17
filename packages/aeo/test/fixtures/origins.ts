import {
  DocsPublicationOrigin,
  PublicHttpOrigin,
} from "@taxkit/content/schemas";
import { Effect, Schema } from "effect";

// This stage's two checked origins for tests.
export const exampleOrigins = Effect.all({
  apiOrigin: Schema.decodeEffect(PublicHttpOrigin)("https://api.example.com"),
  publicationOrigin: Schema.decodeEffect(DocsPublicationOrigin)(
    "https://website.example.com"
  ),
});
