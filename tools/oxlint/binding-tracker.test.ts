import { expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Effect,
  Equal,
  Hash,
  HashMap,
  Option,
} from "effect";

import { referenceIdentity } from "./binding-tracker.ts";
// Host syntax objects and scope variables may have the same fields while
// representing different bindings. The map must retain their reference identity.
it.effect("keeps matching-looking host objects as separate binding keys", () =>
  Effect.sync(() => {
    const first = { name: "same-name" };
    const second = { name: "same-name" };
    const firstKey = referenceIdentity(first);
    const secondKey = referenceIdentity(second);
    const bindings = HashMap.make([firstKey, "first"], [secondKey, "second"]);
    EffectFunction.pipe(
      Equal.equals(firstKey, referenceIdentity(first)),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
    EffectFunction.pipe(Equal.equals(firstKey, secondKey), (actual) => {
      expect(!actual).toBeTruthy();
    });
    EffectFunction.pipe(Hash.hash(firstKey), (actual) => {
      expect(actual).toBe(Hash.hash(referenceIdentity(first)));
    });
    EffectFunction.pipe(HashMap.size(bindings), (actual) => {
      expect(actual).toBe(2);
    });
    EffectFunction.pipe(
      HashMap.get(bindings, referenceIdentity(first)),
      (actual) => {
        expect(actual).toStrictEqual(Option.some("first"));
      }
    );
    EffectFunction.pipe(
      HashMap.get(bindings, referenceIdentity(second)),
      (actual) => {
        expect(actual).toStrictEqual(Option.some("second"));
      }
    );
  })
);
it.effect("refuses an unrelated equality object without a host value", () =>
  Effect.sync(() => {
    const host = { name: "fixture" };
    const key = referenceIdentity(host);
    const unrelated: Equal.Equal = {
      [Equal.symbol]: () => false,
      [Hash.symbol]: () => Hash.hash(key),
    };
    EffectFunction.pipe(Equal.equals(key, unrelated), (actual) => {
      expect(!actual).toBeTruthy();
    });
  })
);
