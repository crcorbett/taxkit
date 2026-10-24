import { ContentServiceLive } from "@taxkit/content/live";
import { ContentCatalogue } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Layer } from "effect";

export const ContentTestLive = ContentServiceLive.pipe(
  Layer.provide(Layer.effect(ContentCatalogue, exampleContentCatalogue))
);
