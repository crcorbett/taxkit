import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";

import { DocsContentServiceLive } from "../live.layer.js";
import { DocsPagePath, DocsSourcePath } from "../schemas.js";
import { DocsContentService } from "../service.js";
import {
  getNavigation,
  validateContent,
  validateMdxComponentPolicy,
  validationSummary,
} from "./policy.js";

describe("docs content validation policy", () => {
  it.effect("decodes navigation through the canonical schema", () =>
    Effect.gen(function* () {
      const navigation = yield* getNavigation;

      expect(navigation.contentRoot).toBe("apps/docs/content");
      expect(navigation.primaryNavigation.length).toBeGreaterThan(0);
    })
  );

  it.effect("validates the current public docs corpus", () =>
    Effect.gen(function* () {
      const result = yield* validateContent;

      expect(result.issues).toEqual([]);
      expect(Option.isNone(validationSummary(result))).toBe(true);
    })
  );

  it.effect("serves pages through DocsContentServiceLive", () => {
    const path = Schema.decodeUnknownSync(DocsPagePath)("/start");

    return Effect.gen(function* () {
      const service = yield* DocsContentService;
      const page = yield* service.getPage(path);
      const renderablePage = yield* service.getRenderablePage(path);
      const guidePath = Schema.decodeUnknownSync(DocsPagePath)(
        "/guides/calculate-australian-take-home-pay"
      );
      const guidePage = yield* service.getPage(guidePath);
      const pages = yield* service.listPages();

      expect(typeof renderablePage.body).toBe("function");
      expect(page.frontmatter.title).toBe("Start");
      expect(page.source).toBe("content/start/index.mdx");
      expect(page.slugs).toEqual(["start"]);
      expect(guidePage.source).toBe(
        "content/guides/calculate-australian-take-home-pay.mdx"
      );
      expect(renderablePage.toc).toEqual(expect.any(Array));
      expect(pages.length).toBeGreaterThan(0);
    }).pipe(Effect.provide(DocsContentServiceLive));
  });

  it.effect(
    "validates MDX component usage outside code spans and fences",
    () => {
      const source = Schema.decodeUnknownSync(DocsSourcePath)(
        "content/start/quickstart.mdx"
      );

      return Effect.gen(function* () {
        const safeIssues = yield* validateMdxComponentPolicy(
          source,
          [
            "`SdkCalculatorRunResponse<Report>` is inline code.",
            "```tsx",
            "<UnsafeComponent />",
            "```",
          ].join("\n")
        );
        const unsafeIssues = yield* validateMdxComponentPolicy(
          source,
          "<UnsafeComponent />"
        );

        expect(safeIssues).toEqual([]);
        expect(unsafeIssues).toMatchObject([
          {
            message: "MDX component not allowed: UnsafeComponent",
            path: [source],
          },
        ]);
      });
    }
  );
});
