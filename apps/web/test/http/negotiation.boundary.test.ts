import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Effect, Layer, Option } from "effect";
import { Headers, HttpServerRequest, HttpServerResponse } from "effect/http";

import {
  TaxKitWebConfigError,
  WebsiteApiConfigError,
} from "../../src/lib/host/errors";
import { WebsiteApi, WebsiteSettings } from "../../src/lib/host/service";
import { withDocsRepresentation } from "../../src/lib/http/negotiation.ingress";

const unconfigured = new TaxKitWebConfigError({
  message: "TaxKit web settings are missing or invalid.",
  operation: "settings",
  runtime: "server",
});
describe("documentation HTML response headers", () => {
  it.effect.each([
    { existing: "", expected: "Accept" },
    { existing: "Accept-Encoding", expected: "Accept-Encoding, Accept" },
    {
      existing: "Accept-Encoding, aCcEpT",
      expected: "Accept-Encoding, aCcEpT",
    },
    { existing: "*", expected: "*" },
  ])("preserves $existing while varying on Accept", ({ existing, expected }) =>
    EffectFunction.pipe(
      Effect.succeed(
        HttpServerResponse.text("accepted HTML", {
          contentType: "text/html",
          headers: { vary: existing },
        })
      ),
      withDocsRepresentation
    ).pipe(
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromWeb(
          new Request("http://127.0.0.1:4196/start/quickstart")
        )
      ),
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(WebsiteApi, {
            client: Effect.fail(new WebsiteApiConfigError()).pipe(
              Effect.withSpan("WebsiteApi.client")
            ),
          }),
          Layer.mock(WebsiteSettings, {
            settings: Effect.fail(unconfigured).pipe(
              Effect.withSpan("WebsiteSettings.settings")
            ),
          })
        )
      ),
      Effect.scoped,
      Effect.tap((response) =>
        Effect.sync(() => {
          EffectFunction.pipe(
            Headers.get(response.headers, "vary"),
            (actual) => {
              expect(actual).toStrictEqual(Option.some(expected));
            }
          );
          expect(response.status).toBe(200);
        })
      )
    )
  );
});
describe("documentation Markdown negotiation", () => {
  it.effect("moves a Markdown preference at a page to its Markdown file", () =>
    EffectFunction.pipe(
      Effect.succeed(HttpServerResponse.text("accepted HTML")),
      withDocsRepresentation
    ).pipe(
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromWeb(
          new Request("http://127.0.0.1:4196/start/quickstart", {
            headers: { accept: "text/markdown" },
          })
        )
      ),
      // The redirect needs neither the API nor the Website settings.
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(WebsiteApi, {
            client: Effect.fail(new WebsiteApiConfigError()).pipe(
              Effect.withSpan("WebsiteApi.client")
            ),
          }),
          Layer.mock(WebsiteSettings, {
            settings: Effect.fail(unconfigured).pipe(
              Effect.withSpan("WebsiteSettings.settings")
            ),
          })
        )
      ),
      Effect.scoped,
      Effect.tap((response) =>
        Effect.sync(() => {
          expect(response.status).toBe(307);
          EffectFunction.pipe(
            Headers.get(response.headers, "location"),
            (actual) => {
              expect(actual).toStrictEqual(Option.some("/start/quickstart.md"));
            }
          );
          EffectFunction.pipe(
            Headers.get(response.headers, "vary"),
            (actual) => {
              expect(actual).toStrictEqual(Option.some("Accept"));
            }
          );
        })
      )
    )
  );
});
