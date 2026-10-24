import { describe, expect, it } from "@effect/vitest";
import { Result, Schema } from "effect";

import { DocsAccept } from "../src/negotiation.ingress.js";

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
    expect(Schema.decodeResult(DocsAccept)(header)).toEqual(
      Result.succeed(expected)
    );
  });
  it("rejects excess header characters before parsing", () => {
    expect(
      Result.isFailure(Schema.decodeResult(DocsAccept)("x".repeat(4097)))
    ).toBe(true);
  });
  it("bounds media ranges", () => {
    expect(Schema.decodeResult(DocsAccept)("text/html,".repeat(65))).toEqual(
      Result.succeed("invalid")
    );
  });
});
