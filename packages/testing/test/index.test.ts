import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction } from "effect";

import { expectAt } from "../src/index.js";

describe("testing fixtures", () => {
  it("returns present values including null and preserves object identity", () => {
    const value = { present: true };
    EffectFunction.pipe(expectAt([value], 0), (actual) => {
      expect(actual).toBe(value);
    });
    EffectFunction.pipe(expectAt([null], 0), (actual) => {
      expect(actual).toBeNull();
    });
    EffectFunction.pipe(expectAt([false], 0), (actual) => {
      expect(!actual).toBeTruthy();
    });
  });

  it.each([
    { index: 0, items: [] },
    { index: -1, items: [1] },
    { index: 1, items: [1] },
    { index: 0, items: [undefined] },
  ])("rejects absent or undefined entries at $index", ({ items, index }) => {
    expect(() => expectAt(items, index)).toThrow(
      `Expected item at index ${index}`
    );
  });
});
