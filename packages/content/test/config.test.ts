import { assert, it } from "@effect/vitest";
import { ConfigProvider, Effect } from "effect";

import {
  DocsPublicationOriginConfig,
  DocsWebsiteOriginConfig,
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
