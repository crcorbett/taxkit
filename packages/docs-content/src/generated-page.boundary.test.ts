import { expect, it } from "@effect/vitest";
import { FumadocsSourceLoadError } from "@taxkit/docs-fumadocs/errors";
import { Effect, Schema } from "effect";
import { vi } from "vitest";

import { readGeneratedPage } from "./generated-page.boundary.js";

const page = {
  data: {
    description: "A guide.",
    status: "draft" as const,
    title: "Guide",
  },
  path: "guide.mdx",
  slugs: ["guide"],
};

it.effect("reads only processed text and preserves the provider receiver", () =>
  Effect.gen(function* () {
    const readablePage = {
      ...page,
      data: {
        ...page.data,
        getText: vi
          .fn<Parameters<typeof readGeneratedPage>[0]["data"]["getText"]>()
          .mockResolvedValue("# Guide"),
      },
    };
    const representation = yield* readGeneratedPage(readablePage, "getPage");
    expect(representation.markdown).toBe("# Guide");
    expect(representation.sourcePath).toBe("content/guide.mdx");
    expect(readablePage.data.getText).toHaveBeenCalledExactlyOnceWith(
      "processed"
    );
    expect(readablePage.data.getText.mock.contexts).toEqual([
      readablePage.data,
    ]);
  })
);

it.effect.each(["getPage", "listPages"] as const)(
  "redacts processed-text rejection for %s",
  (operation) =>
    Effect.gen(function* () {
      const rejectedPage = {
        ...page,
        data: {
          ...page.data,
          getText: vi
            .fn<Parameters<typeof readGeneratedPage>[0]["data"]["getText"]>()
            .mockRejectedValue(
              new Error("private-provider-sentinel:/private/source")
            ),
        },
      };
      const error = yield* readGeneratedPage(rejectedPage, operation).pipe(
        Effect.flip
      );
      expect(error.operation).toBe(operation);
      const encoded = yield* Schema.encodeEffect(
        Schema.fromJsonString(FumadocsSourceLoadError)
      )(error);
      expect(encoded).not.toContain("private-provider-sentinel");
      expect(encoded).not.toContain("/private/source");
    })
);
