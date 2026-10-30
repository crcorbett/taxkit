import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Option, Schema } from "effect";
import { Headers } from "effect/http";

import {
  CalculatorHostMode,
  edgeCallerKey,
} from "../src/edge-identity.boundary.js";

describe("edge identity", () => {
  // A domain-free stand-in for the consumer-supplied key Schema.
  const FixtureCallerKey = Schema.String.check(
    Schema.isPattern(/^\d{1,3}(?:\.\d{1,3}){3}$/u)
  ).pipe(Schema.brand("FixtureCallerKey"));

  it("admits only checked direct edge identity and rejects Worker subrequests", () => {
    EffectFunction.pipe(
      EffectFunction.pipe(
        Headers.fromInput({ "cf-connecting-ip": "203.0.113.4" }),
        (argument1) =>
          EffectFunction.pipe(FixtureCallerKey, (argument2) =>
            edgeCallerKey(argument1, argument2)
          )
      ),
      (actual) => {
        expect(actual).toStrictEqual(Option.some("203.0.113.4"));
      }
    );
    EffectFunction.pipe(
      EffectFunction.pipe(
        Headers.fromInput({
          "cf-connecting-ip": "203.0.113.4",
          "cf-worker": "same-zone.example",
        }),
        (argument3) =>
          EffectFunction.pipe(FixtureCallerKey, (argument4) =>
            edgeCallerKey(argument3, argument4)
          )
      ),
      (actual) => {
        expect(actual).toStrictEqual(Option.none());
      }
    );
    EffectFunction.pipe(
      EffectFunction.pipe(Headers.fromInput({}), (argument5) =>
        EffectFunction.pipe(FixtureCallerKey, (argument6) =>
          edgeCallerKey(argument5, argument6)
        )
      ),
      (actual) => {
        expect(actual).toStrictEqual(Option.none());
      }
    );
    EffectFunction.pipe(
      EffectFunction.pipe(
        Headers.fromInput({ "cf-connecting-ip": "" }),
        (argument7) =>
          EffectFunction.pipe(FixtureCallerKey, (argument8) =>
            edgeCallerKey(argument7, argument8)
          )
      ),
      (actual) => {
        expect(actual).toStrictEqual(Option.none());
      }
    );
    EffectFunction.pipe(
      EffectFunction.pipe(
        Headers.fromInput({ "cf-connecting-ip": "not-an-address" }),
        (argument9) =>
          EffectFunction.pipe(FixtureCallerKey, (argument10) =>
            edgeCallerKey(argument9, argument10)
          )
      ),
      (actual) => {
        expect(actual).toStrictEqual(Option.none());
      }
    );
    EffectFunction.pipe(Schema.is(CalculatorHostMode)("edge"), (actual) => {
      expect(actual).toBeTruthy();
    });
    EffectFunction.pipe(
      Schema.is(CalculatorHostMode)("local-emulator"),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
    EffectFunction.pipe(
      Schema.is(CalculatorHostMode)("untrusted"),
      (actual) => {
        expect(!actual).toBeTruthy();
      }
    );
  });
});
