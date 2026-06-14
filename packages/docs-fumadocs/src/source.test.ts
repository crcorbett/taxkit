import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { FumadocsPageNotFoundError } from "./schemas.js";
import { loadFumadocsPage, loadFumadocsPages } from "./source.js";
import type { FumadocsSourceLoader } from "./source.js";

const page = {
  slugs: ["guide"],
  title: "Guide",
};

const loader: FumadocsSourceLoader<typeof page, never> = {
  getNodeMeta: () => Option.none<never>().pipe(Option.getOrUndefined),
  getNodePage: () => Option.none<typeof page>().pipe(Option.getOrUndefined),
  getPage: (slugs) =>
    Option.fromUndefinedOr(slugs).pipe(
      Option.filter((value) => value.join("/") === page.slugs.join("/")),
      Option.match({
        onNone: () => Option.none<typeof page>().pipe(Option.getOrUndefined),
        onSome: () => page,
      })
    ),
  getPageTree: () => ({
    children: [],
    name: "Docs",
  }),
  getPages: () => [page],
};

describe("source loader helpers", () => {
  it.effect("loads a generated page through an Effect boundary", () =>
    loadFumadocsPage(loader, ["guide"]).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          expect(result).toEqual(page);
        })
      )
    )
  );

  it.effect("returns a tagged error when a page is missing", () =>
    loadFumadocsPage(loader, ["missing"]).pipe(
      Effect.flip,
      Effect.tap((error) =>
        Effect.sync(() => {
          expect(error).toBeInstanceOf(FumadocsPageNotFoundError);
        })
      )
    )
  );

  it.effect("lists generated pages through an Effect boundary", () =>
    loadFumadocsPages(loader).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          expect(result).toEqual([page]);
        })
      )
    )
  );
});
