import { expect, it } from "@effect/vitest";
import { requestDocsPage } from "@taxkit/api-http/requests";
import { DocsPublicNavigation, DocsPublicPage } from "@taxkit/content/schemas";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import {
  Array,
  Effect,
  Layer,
  Match,
  Result,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import { vi } from "vitest";

import { WebsiteApiLive } from "../../src/lib/host/binding.adapter.layer";
import { WebsiteBindings } from "../../src/lib/host/config.ingress";
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
        fetch: vi.fn<(request: Request) => ReturnType<typeof globalThis.fetch>>(
          (request) =>
            Promise.resolve(
              new Response(
                EffectBoolean.match(request.url.includes("navigation"), {
                  onFalse: () =>
                    Match.value(reply).pipe(
                      Match.when("malformed", (): "{}" => "{}"),
                      Match.orElse(() => encodedPage)
                    ),
                  onTrue: () => navigation,
                }),
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
      const client = yield* api.client;
      const result = yield* requestDocsPage({
        client,
        address: Match.value(reply).pipe(
          Match.when(
            "mismatched",
            (): "/start/quickstart" => "/start/quickstart"
          ),
          Match.orElse(() => page.path)
        ),
      }).pipe(Effect.result);
      const outcome = Result.match(result, {
        onSuccess: (): "Success" => "Success",
        onFailure: (failure) =>
          Match.value(failure).pipe(
            Match.tag("ApiReplyMismatch", () => "ApiReplyMismatch"),
            Match.tag("ApiUnavailable", () => "ApiUnavailable"),
            Match.tag("ApiDeadlineExceeded", () => "ApiDeadlineExceeded"),
            Match.tag("ApiReplyTooLarge", () => "ApiReplyTooLarge"),
            Match.tag("DocsPageUnavailable", () => "DocsPageUnavailable"),
            Match.tag("HttpClientError", () => "HttpClientError"),
            Match.tag("SchemaError", () => "SchemaError"),
            Match.tag("TimeoutError", () => "TimeoutError"),
            Match.exhaustive
          ),
      });
      expect(outcome).toBe(expected);
      if (Result.isSuccess(result)) {
        expect(result.success.page.path).toBe(page.path);
      }
    }).pipe(Effect.scoped)
);
