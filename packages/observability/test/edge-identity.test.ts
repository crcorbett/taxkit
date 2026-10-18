import { expect, it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";
import { Headers } from "effect/http";

import {
  CalculatorHostMode,
  WebsiteForwardingCredential,
  calculatorEdgeRateKey,
} from "../src/edge-identity.boundary.js";

it("admits only checked direct edge identity and rejects Worker subrequests", () => {
  const direct = calculatorEdgeRateKey(
    Headers.fromInput({ "cf-connecting-ip": "203.0.113.4" })
  );
  expect(Option.isSome(direct)).toBe(true);
  expect(
    calculatorEdgeRateKey(
      Headers.fromInput({
        "cf-connecting-ip": "203.0.113.4",
        "cf-worker": "same-zone.example",
      })
    )
  ).toEqual(Option.none());
  expect(calculatorEdgeRateKey(Headers.fromInput({}))).toEqual(Option.none());
  expect(
    calculatorEdgeRateKey(Headers.fromInput({ "cf-connecting-ip": "" }))
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
