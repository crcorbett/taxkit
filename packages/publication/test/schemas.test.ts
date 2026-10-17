import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  DocsDiscoveryDocument,
  DocsDiscoverySettings,
} from "../src/schemas.js";

describe("publication discovery ingress", () => {
  it.effect(
    "rejects mismatched discovery media types and oversized bodies",
    () =>
      Effect.gen(function* () {
        yield* Effect.forEach(
          [
            {
              body: "<urlset/>",
              contentType: "text/plain",
              path: "/sitemap.xml",
            },
            {
              body: "# TaxKit",
              contentType: "application/xml",
              path: "/llms.txt",
            },
            { body: "private", contentType: "text/plain", path: "/private" },
            {
              body: "x".repeat(300_001),
              contentType: "text/plain",
              path: "/llms-full.txt",
            },
          ],
          (value) =>
            Schema.decodeUnknownEffect(DocsDiscoveryDocument)(value).pipe(
              Effect.flip,
              Effect.tap((error) =>
                Effect.sync(() => assert.equal(error._tag, "SchemaError"))
              )
            )
        );
      })
  );
  it.effect(
    "admits HTTPS and exact local origins while rejecting address decorations",
    () =>
      Effect.gen(function* () {
        yield* Effect.forEach(
          [
            "https://website.example.com",
            "http://localhost:4000",
            "http://127.0.0.1:4000",
          ],
          (publicationOrigin) =>
            Schema.decodeEffect(DocsDiscoverySettings)({
              apiOrigin: "https://api.example.com",
              publicationOrigin,
            })
        );
        yield* Effect.forEach(
          [
            "http://website.example.com",
            "https://website.example.com/path",
            "https://website.example.com?private=1",
            "https://user:secret@website.example.com",
            "https://website.example.com/#private",
          ],
          (publicationOrigin) =>
            Schema.decodeEffect(DocsDiscoverySettings)({
              apiOrigin: "https://api.example.com",
              publicationOrigin,
            }).pipe(Effect.flip)
        );
      })
  );
});
