import { expect, it } from "@effect/vitest";
import { requestDocsPage } from "@taxkit/api-http/requests";
import { DocsPublicNavigation, DocsPublicPage } from "@taxkit/content/schemas";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Array, Effect, Layer, Match, Result, Schema } from "effect";
import { vi } from "vitest";

import { WebsiteApiLive } from "../../src/lib/host/binding.server";
import { WebsiteBindings } from "../../src/lib/host/config.server";
import { WebsiteApi } from "../../src/lib/host/service";

it.effect.each([
  { expected: "Success", reply: "matching" },
  { expected: "ApiReplyMismatch", reply: "mismatched" },
  { expected: "ApiUnavailable", reply: "malformed" },
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
        connect: vi.fn<(...args: readonly unknown[]) => void>(),
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
      const result = yield* requestDocsPage(
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
