import { expect, it } from "@effect/vitest";
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

it("admits only checked direct edge identity and rejects Worker subrequests", () => {
  expect(
    edgeCallerKey(
      Headers.fromInput({ "cf-connecting-ip": "203.0.113.4" }),
      FixtureCallerKey
    )
  ).toEqual(Option.some("203.0.113.4"));
  expect(
    edgeCallerKey(
      Headers.fromInput({
        "cf-connecting-ip": "203.0.113.4",
        "cf-worker": "same-zone.example",
      }),
      FixtureCallerKey
    )
  ).toEqual(Option.none());
  expect(edgeCallerKey(Headers.fromInput({}), FixtureCallerKey)).toEqual(
    Option.none()
  );
  expect(
    edgeCallerKey(
      Headers.fromInput({ "cf-connecting-ip": "" }),
      FixtureCallerKey
    )
  ).toEqual(Option.none());
  expect(
    edgeCallerKey(
      Headers.fromInput({ "cf-connecting-ip": "not-an-address" }),
      FixtureCallerKey
    )
  ).toEqual(Option.none());
  expect(Schema.is(CalculatorHostMode)("edge")).toBe(true);
  expect(Schema.is(CalculatorHostMode)("local-emulator")).toBe(true);
  expect(Schema.is(CalculatorHostMode)("untrusted")).toBe(false);
});
