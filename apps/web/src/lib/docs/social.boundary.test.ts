import { describe, expect, it } from "@effect/vitest";
import { CalculatorRpcOrigin } from "@taxkit/api-rpc/schemas";
import { DocsPublicPage } from "@taxkit/content/schemas";
import {
  exampleContentCatalogue,
  exampleDiscoverySettings,
} from "@taxkit/content/testing/fixtures";
import { Array, Effect, Result, Schema } from "effect";

import { WebsiteDocsImageBytes } from "../../../scripts/docs-images.schemas";
import { WebsitePublicSettings } from "../schemas";
import { docsMetadata } from "./metadata.egress";
import { docsImagePath, WebsiteDocsArticleJson } from "./social.schemas";

// Only an envelope fixture. The real built images must independently decode in
// Chromium; a valid prefix alone cannot establish image pixels.
const envelope = Uint8Array.of(
  137,
  80,
  78,
  71,
  13,
  10,
  26,
  10,
  0,
  0,
  0,
  13,
  73,
  72,
  68,
  82,
  0,
  0,
  4,
  176,
  0,
  0,
  2,
  118
);

describe("public documentation images and structured data", () => {
  it("checks PNG dimensions, truncation, byte bounds and signature", () => {
    expect(
      Result.isSuccess(Schema.decodeResult(WebsiteDocsImageBytes)(envelope))
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeResult(WebsiteDocsImageBytes)(envelope.slice(0, 23))
      )
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeResult(WebsiteDocsImageBytes)(new Uint8Array(500_001))
      )
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeResult(WebsiteDocsImageBytes)(
          Uint8Array.from(envelope, (byte, index) => (index === 0 ? 0 : byte))
        )
      )
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeResult(WebsiteDocsImageBytes)(
          Uint8Array.from(envelope, (byte, index) => (index === 19 ? 0 : byte))
        )
      )
    ).toBe(true);
  });

  it.effect(
    "keeps checked public details and safely encodes script characters",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        const checked = yield* Array.head(catalogue.pages).pipe(
          Effect.fromOption
        );
        const settings = yield* exampleDiscoverySettings;
        const page = DocsPublicPage.make({
          ...checked,
          frontmatter: DocsPublicPage.fields.frontmatter.make({
            ...checked.frontmatter,
            description: "Description < & > \u2029 end",
            title: "Title </script><script>PRIVATE9</script>\u2028 end",
          }),
        });
        const publicSettings = WebsitePublicSettings.make({
          apiOrigin: CalculatorRpcOrigin.make(settings.apiOrigin),
          websiteOrigin: settings.websiteOrigin,
        });
        const metadata = yield* Effect.fromResult(
          docsMetadata(page, publicSettings)
        );
        const script = yield* Array.head(metadata.scripts).pipe(
          Effect.fromOption
        );
        expect(script.type).toBe("application/ld+json");
        expect(script.children).not.toContain("<");
        expect(script.children).not.toContain("\u2028");
        expect(script.children).not.toContain("\u2029");
        const article = yield* Schema.decodeEffect(WebsiteDocsArticleJson)(
          script.children
        );
        expect(article.headline).toBe(page.frontmatter.title);
        expect(article.description).toBe(page.frontmatter.description);
        expect(article.url.href).toBe(
          "https://website.example.com/start/overview"
        );
        expect(article.image.href).toBe(
          "https://website.example.com/og/start/overview.png"
        );
        expect(docsImagePath(page)).toBe("/og/start/overview.png");
        expect(metadata.links).toEqual([
          { href: article.url.href, rel: "canonical" },
          {
            href: `${article.url.href}.md`,
            rel: "alternate",
            type: "text/markdown",
          },
        ]);
        expect(metadata.meta).toContainEqual({
          content: article.image.href,
          property: "og:image",
        });
        expect(metadata.meta).toContainEqual({
          content: "summary_large_image",
          name: "twitter:card",
        });
        expect(script.children).not.toContain('"author"');
        expect(script.children).not.toContain('"dateModified"');
      })
  );
});
