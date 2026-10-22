import { expect, it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";
import { Headers } from "effect/http";

import {
  CalculatorHostMode,
  WebsiteForwardingCredential,
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

it.effect("redacts and refuses to encode forwarding credentials", () =>
  Effect.gen(function* () {
    const credential = yield* Schema.decodeUnknownEffect(
      WebsiteForwardingCredential
    )("a".repeat(64));
    // oxlint-disable-next-line typescript/no-base-to-string -- Verify that implicit string conversion cannot reveal the secret.
    expect(String(credential)).not.toContain("a".repeat(64));
    expect(
      yield* Schema.encodeEffect(WebsiteForwardingCredential)(credential).pipe(
        Effect.isFailure
      )
    ).toBe(true);
    expect(
      Schema.decodeUnknownOption(WebsiteForwardingCredential)("A".repeat(64))
    ).toEqual(Option.none());
    expect(
      Schema.decodeUnknownOption(WebsiteForwardingCredential)("a".repeat(63))
    ).toEqual(Option.none());
  })
);
