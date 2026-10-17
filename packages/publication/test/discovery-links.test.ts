import { assert, describe, it } from "@effect/vitest";
import { TaxKitApi } from "@taxkit/api-http/api";
import {
  DocsApiPath,
  discoveryApiPath,
  DiscoveryPath,
} from "@taxkit/api-http/routes";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Array, Effect, Option, Record, Schema } from "effect";
import { OpenApi } from "effect/http-api";

import { exampleDiscoverySettings } from "../src/__testing__/fixtures.js";
import { ContentDiscovery } from "../src/service.js";
import { makeContentDiscoveryTest } from "../src/test.layer.js";

describe("published discovery links", () => {
  it.effect(
    "targets a declared native GET Markdown route for every published page",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        const settings = yield* exampleDiscoverySettings;
        const setup = yield* makeContentDiscoveryTest(catalogue, settings);
        const index = yield* ContentDiscovery.pipe(
          Effect.flatMap((service) => service.getDocument("/llms.txt")),
          Effect.provide(setup.layer)
        );
        const links = Array.fromIterable(
          index.body.matchAll(/\]\((?<address>https?:\/\/[^)]+)\)/gu)
        );
        assert.equal(links.length, catalogue.pages.length);
        yield* Effect.forEach(
          Array.zip(links, catalogue.pages),
          ([match, page]) =>
            Effect.gen(function* () {
              const address = yield* Schema.decodeUnknownEffect(
                Schema.URLFromString
              )(yield* Effect.fromOption(Array.get(match, 1)));
              assert.equal(address.origin, settings.apiOrigin.origin);
              assert.isTrue(Schema.is(DocsApiPath)(address.pathname));
              assert.isTrue(
                Record.get(
                  OpenApi.fromApi(TaxKitApi).paths,
                  address.pathname
                ).pipe(
                  Option.flatMap((path) => Option.fromNullishOr(path.get)),
                  Option.isSome
                )
              );
              assert.equal(address.searchParams.get("path"), page.path);
            })
        );
        assert.equal(DiscoveryPath.literals.length, 4);
        assert.equal(
          discoveryApiPath("/llms.txt"),
          "/api/v1/docs/discovery/llms.txt"
        );
      })
  );
});
