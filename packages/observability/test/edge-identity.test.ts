import { describe, expect, it } from "@effect/vitest";
import { Option, Schema } from "effect";
import { Headers } from "effect/http";

import {
  CalculatorHostMode,
  edgeCallerKey,
} from "../src/edge-identity.boundary.js";

// A domain-free stand-in for the consumer-supplied key Schema.
const FixtureCallerKey = Schema.String.check(
  Schema.isPattern(/^\d{1,3}(?:\.\d{1,3}){3}$/u)
).pipe(Schema.brand("FixtureCallerKey"));

describe("edge identity", () => {
  it.each([
    {
      name: "a checked direct address",
      headers: Headers.fromInput({ "cf-connecting-ip": "203.0.113.4" }),
      expected: Option.some(FixtureCallerKey.make("203.0.113.4")),
    },
    {
      name: "a Worker subrequest",
      headers: Headers.fromInput({
        "cf-connecting-ip": "203.0.113.4",
        "cf-worker": "same-zone.example",
      }),
      expected: Option.none(),
    },
    {
      name: "missing identity",
      headers: Headers.fromInput({}),
      expected: Option.none(),
    },
    {
      name: "empty identity",
      headers: Headers.fromInput({ "cf-connecting-ip": "" }),
      expected: Option.none(),
    },
    {
      name: "malformed identity",
      headers: Headers.fromInput({ "cf-connecting-ip": "not-an-address" }),
      expected: Option.none(),
    },
  ])("checks $name", ({ headers, expected }) => {
    const identity = edgeCallerKey(headers, FixtureCallerKey);
    expect(identity).toStrictEqual(expected);
  });

  it.each([
    { mode: "edge", accepted: true },
    { mode: "local-emulator", accepted: true },
    { mode: "untrusted", accepted: false },
  ])("checks the $mode host mode", ({ mode, accepted }) => {
    const checked = Schema.is(CalculatorHostMode)(mode);
    expect(checked === accepted).toBeTruthy();
  });
});
