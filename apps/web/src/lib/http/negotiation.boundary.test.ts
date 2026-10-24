import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, Option, Result } from "effect";
import { Headers, HttpServerRequest, HttpServerResponse } from "effect/http";

import { TaxKitWebConfigError, WebsiteApiConfigError } from "../host/errors";
import { WebsiteApi, WebsiteSettings } from "../host/service";
import { withDocsRepresentation } from "./negotiation.server";

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
    withDocsRepresentation(
      Effect.succeed(
        HttpServerResponse.text("accepted HTML", {
          contentType: "text/html",
          headers: { vary: existing },
        })
      )
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
            client: Result.fail(new WebsiteApiConfigError()),
          }),
          Layer.mock(WebsiteSettings, { settings: Result.fail(unconfigured) })
        )
      ),
      Effect.scoped,
      Effect.tap((response) =>
        Effect.sync(() => {
          expect(Headers.get(response.headers, "vary")).toEqual(
            Option.some(expected)
          );
          expect(response.status).toBe(200);
        })
      )
    )
  );
});

describe("documentation Markdown negotiation", () => {
  it.effect("moves a Markdown preference at a page to its Markdown file", () =>
    withDocsRepresentation(
      Effect.succeed(HttpServerResponse.text("accepted HTML"))
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
            client: Result.fail(new WebsiteApiConfigError()),
          }),
          Layer.mock(WebsiteSettings, { settings: Result.fail(unconfigured) })
        )
      ),
      Effect.scoped,
      Effect.tap((response) =>
        Effect.sync(() => {
          expect(response.status).toBe(307);
          expect(Headers.get(response.headers, "location")).toEqual(
            Option.some("/start/quickstart.md")
          );
          expect(Headers.get(response.headers, "vary")).toEqual(
            Option.some("Accept")
          );
        })
      )
    )
  );
});
