import { assert, it } from "@effect/vitest";
import { exampleThemeInput } from "@taxkit/mdx/testing/fixtures";
import { ConfigProvider, Effect } from "effect";

import {
  DocsPublicationOriginConfig,
  DocsWebsiteOriginConfig,
  DocsThemeConfig,
} from "../src/config.js";

const read = (input: Readonly<Record<string, string>>) =>
  Effect.all({
    publication: DocsPublicationOriginConfig,
    website: DocsWebsiteOriginConfig,
  }).pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown(input)
    )
  );

it.effect("reads each origin from its one host binding name", () =>
  Effect.gen(function* () {
    const origins = yield* read({
      TAXKIT_PUBLICATION_ORIGIN: "https://taxkit.example",
      WEBSITE_PUBLIC_ORIGIN: "https://preview.taxkit.example",
    });
    assert.strictEqual(origins.publication.href, "https://taxkit.example/");
    assert.strictEqual(origins.website.href, "https://preview.taxkit.example/");
  })
);

it.effect(
  "loads the complete paired theme and rejects missing or incomplete input",
  () =>
    Effect.gen(function* () {
      const theme = yield* DocsThemeConfig.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({ DOCS_THEME: exampleThemeInput })
        )
      );
      assert.strictEqual(
        theme.dark.palette.background,
        exampleThemeInput.dark.palette.background
      );
      yield* DocsThemeConfig.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({})
        ),
        Effect.flip
      );
      yield* DocsThemeConfig.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            DOCS_THEME: { light: exampleThemeInput.light },
          })
        ),
        Effect.flip
      );
    })
);

it.effect.each([
  {},
  {
    TAXKIT_PUBLICATION_ORIGIN: "https://taxkit.example/docs",
    WEBSITE_PUBLIC_ORIGIN: "https://preview.taxkit.example",
  },
  {
    TAXKIT_PUBLICATION_ORIGIN: "https://taxkit.example",
    WEBSITE_PUBLIC_ORIGIN: "http://preview.taxkit.example",
  },
])("rejects absent or non-origin bindings %j", (input) =>
  Effect.gen(function* () {
    assert.isTrue(yield* read(input).pipe(Effect.isFailure));
  })
);
