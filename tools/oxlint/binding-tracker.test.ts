import { expect, it as test } from "@effect/vitest";
import { Effect, Equal, Hash, HashMap, Option } from "effect";

import { referenceIdentity } from "./binding-tracker.ts";

// Host syntax objects and scope variables may have the same fields while
// representing different bindings. The map must retain their reference identity.
test.effect(
  "keeps matching-looking host objects as separate binding keys",
  () =>
    Effect.sync(() => {
      const first = { name: "same-name" };
      const second = { name: "same-name" };
      const firstKey = referenceIdentity(first);
      const secondKey = referenceIdentity(second);
      const bindings = HashMap.make([firstKey, "first"], [secondKey, "second"]);
      expect(Equal.equals(firstKey, referenceIdentity(first))).toBe(true);
      expect(Equal.equals(firstKey, secondKey)).toBe(false);
      expect(Hash.hash(firstKey)).toBe(Hash.hash(referenceIdentity(first)));
      expect(HashMap.size(bindings)).toBe(2);
      expect(HashMap.get(bindings, referenceIdentity(first))).toEqual(
        Option.some("first")
      );
      expect(HashMap.get(bindings, referenceIdentity(second))).toEqual(
        Option.some("second")
      );
    })
);

test.effect("refuses an unrelated equality object without a host value", () =>
  Effect.sync(() => {
    const host = { name: "fixture" };
    const key = referenceIdentity(host);
    const unrelated: Equal.Equal = {
      [Equal.symbol]: () => false,
      [Hash.symbol]: () => Hash.hash(key),
    };
    expect(Equal.equals(key, unrelated)).toBe(false);
  })
);
