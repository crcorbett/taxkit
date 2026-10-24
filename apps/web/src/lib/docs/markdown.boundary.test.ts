import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, Option, Result, Schema } from "effect";
import { Headers, HttpServerRequest, HttpServerResponse } from "effect/http";

import { WebsiteApiConfigError } from "../api/errors";
import { TaxKitWebConfigError } from "../config";
import { WebsiteApi, WebsiteSettings } from "../host.service";
import { WebsiteDocsAccept } from "../schemas";
import { withDocsRepresentation } from "./markdown.response.server";

describe("documentation representation preferences", () => {
  it.each([
    { expected: "html", header: null },
    { expected: "html", header: "*/*" },
    { expected: "html", header: "text/*" },
    { expected: "html", header: "text/html" },
    { expected: "markdown", header: "text/markdown" },
    { expected: "markdown", header: 'TEXT/MARKDOWN; CHARSET="UTF-8"; Q=0.8' },
    { expected: "html", header: "text/markdown;q=0.7, text/html;q=0.9" },
    { expected: "markdown", header: "text/markdown;q=0.9, text/html;q=0.7" },
    { expected: "html", header: "text/markdown, text/html" },
    { expected: "html", header: "text/markdown;q=0, */*" },
    { expected: "markdown", header: "text/html;q=0, text/*;q=0.6" },
    { expected: "html", header: "text/markdown;q=0.6, text/*;q=0.8" },
    { expected: "unacceptable", header: "text/markdown;q=0, text/html;q=0" },
    { expected: "unacceptable", header: "" },
    { expected: "markdown", header: ", text/markdown, ," },
    {
      expected: "unacceptable",
      header: 'application/json;note="text/markdown"',
    },
    {
      expected: "markdown",
      header: 'application/json;note="a,b;c", text/markdown',
    },
    { expected: "html", header: 'application/json;note="a\\",b;c", text/html' },
    { expected: "unacceptable", header: "text/x-markdown" },
    { expected: "unacceptable", header: "text/markdown;charset=iso-8859-1" },
    { expected: "markdown", header: 'text/markdown;charset="utf\\-8"' },
    { expected: "html", header: "text/markdown;format=private, text/html" },
    { expected: "markdown", header: "text/markdown;q=0.001" },
    { expected: "markdown", header: "text/markdown;q=1.000" },
    { expected: "invalid", header: "text/markdown;q=0.0001" },
    { expected: "invalid", header: "text/markdown;q=1.001" },
    { expected: "invalid", header: "text/markdown;q=-1" },
    { expected: "invalid", header: "text/markdown;q=NaN" },
    { expected: "invalid", header: 'text/markdown;q="1"' },
    { expected: "invalid", header: "text/markdown;q=0;q=1" },
    { expected: "unacceptable", header: "text/markdown;q=0, text/markdown" },
    { expected: "invalid", header: "*/markdown" },
    { expected: "invalid", header: "invalid text/markdown" },
    { expected: "invalid", header: 'text/markdown;note="unfinished' },
    { expected: "invalid", header: "text/markdown;" },
    {
      expected: "unacceptable",
      header:
        "text/html;q=0, text/markdown;charset=utf-8;q=0, text/markdown;q=1",
    },
  ])("selects $expected from $header", ({ header, expected }) => {
    expect(Schema.decodeResult(WebsiteDocsAccept)(header)).toEqual(
      Result.succeed(expected)
    );
  });
  it("rejects excess header characters before parsing", () => {
    expect(
      Result.isFailure(Schema.decodeResult(WebsiteDocsAccept)("x".repeat(4097)))
    ).toBe(true);
  });
  it("bounds media ranges", () => {
    expect(
      Schema.decodeResult(WebsiteDocsAccept)("text/html,".repeat(65))
    ).toEqual(Result.succeed("invalid"));
  });
});

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
