import { describe, expect, test } from "bun:test";

import {
  DocsPageNotFoundError,
  DocsSourceError,
} from "@whattax/docs-content/errors";
import { Exit, Result, Schema } from "effect";

import {
  DocsContentPreloadError,
  docsHomeRouteBoundary,
} from "./route-boundary";

const homeSuccess = {
  navigation: {
    contentRoot: "apps/docs/content",
    primaryNavigation: [],
    status: "published",
  },
  pages: [],
};

const encodedHome = (exit) =>
  Schema.encodeSync(docsHomeRouteBoundary.codec)(exit);

describe("docs route boundary", () => {
  test("normalises encoded success before route composition", () => {
    const result = docsHomeRouteBoundary.decodeToResult(
      encodedHome(Exit.succeed(homeSuccess))
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.success).toEqual(homeSuccess);
    }
  });

  test("preserves expected docs failures as typed result branches", () => {
    const expectedErrors = [
      new DocsContentPreloadError({
        message: "Unable to preload content",
        path: "content/start.mdx",
      }),
      new DocsPageNotFoundError({ path: "/missing" }),
      new DocsSourceError({ cause: new Error("source failed") }),
    ];

    for (const error of expectedErrors) {
      const result = docsHomeRouteBoundary.decodeToResult(
        encodedHome(Exit.fail(error))
      );

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure._tag).toBe(error._tag);
      }
    }
  });

  test("keeps malformed transport distinct from expected docs failures", () => {
    const result = docsHomeRouteBoundary.decodeToResult({ malformed: true });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure._tag).toBe("DocsRouteTransportError");
    }
  });
});
