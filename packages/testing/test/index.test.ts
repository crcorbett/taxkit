import { expect, it } from "@effect/vitest";

import { expectAt } from "../src/index.js";

it("returns present values including null and preserves object identity", () => {
  const value = { present: true };
  expect(expectAt([value], 0)).toBe(value);
  expect(expectAt([null], 0)).toBeNull();
  expect(expectAt([false], 0)).toBe(false);
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
