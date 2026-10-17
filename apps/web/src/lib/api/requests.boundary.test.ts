import { expect, it } from "@effect/vitest";
import { DocsPublicNavigation, DocsPublicPage } from "@taxkit/content/schemas";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Array, Effect, Layer, Match, Result, Schema } from "effect";
import { vi } from "vitest";

import { WebsiteBindings } from "../config.server";
import { WebsiteApi } from "../host.service";
import { WebsiteApiLive } from "./host.server";
import { readDocsPage } from "./requests";

it.effect.each([
  { expected: "Success", reply: "matching" },
  { expected: "WebsiteDocsPageMismatch", reply: "mismatched" },
  { expected: "WebsiteApiUnavailable", reply: "malformed" },
] as const)(
  "checks a $reply docs reply through the native server client",
  ({ reply, expected }) =>
    Effect.gen(function* () {
      const catalogue = yield* exampleContentCatalogue;
      const page = yield* Array.head(catalogue.pages).pipe(Effect.fromOption);
      const navigation = yield* Schema.encodeEffect(
        Schema.fromJsonString(DocsPublicNavigation)
      )(catalogue.navigation);
      const encodedPage = yield* Schema.encodeEffect(
        Schema.fromJsonString(DocsPublicPage)
      )(page);
      const binding = {
        calculatorRequest: vi.fn(),
        connect: vi.fn(),
        // Native Fetcher fixture: the generated client still decodes the bytes.
        fetch: vi.fn((request: Request) =>
          Promise.resolve(
            new Response(
              request.url.includes("navigation")
                ? navigation
                : Match.value(reply).pipe(
                    Match.when("malformed", () => "{}"),
                    Match.orElse(() => encodedPage)
                  ),
              { headers: { "content-type": "application/json" } }
            )
          )
        ),
      };
      const api = yield* WebsiteApi.pipe(
        Effect.provide(
          WebsiteApiLive.pipe(
            Layer.provide(
              Layer.succeed(WebsiteBindings)({
                API_PUBLIC_ORIGIN: "https://api.taxkit.example",
                TAXKIT_API: binding,
              })
            )
          )
        )
      );
      const client = yield* Effect.fromResult(api.client);
      const result = yield* readDocsPage(
        client,
        reply === "mismatched" ? "/start/quickstart" : page.path
      ).pipe(Effect.result);
      expect(Result.isSuccess(result) ? "Success" : result.failure._tag).toBe(
        expected
      );
      if (Result.isSuccess(result)) {
        expect(result.success.page.path).toBe(page.path);
      }
    }).pipe(Effect.scoped)
);
