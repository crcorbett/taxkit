import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";

import { DocsContentServiceLive } from "../live.layer.js";
import { DocsPagePath } from "../schemas.js";
import { DocsContentService } from "../service.js";
import { getNavigation, validateContent, validationSummary } from "./policy.js";

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
      const pages = yield* service.listPages();

      expect(page.frontmatter.title).toBe("Start");
      expect(page.source).toBe("content/start/index.mdx");
      expect(pages.length).toBeGreaterThan(0);
    }).pipe(Effect.provide(DocsContentServiceLive));
  });
});
