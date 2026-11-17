import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Array, Schema, Struct } from "effect";

import { listCalculatorCatalogEntries } from "../src/catalog.js";
import { toCalculatorCatalogItem } from "../src/metadata.js";
import { CalculatorSummary } from "../src/schemas.js";
import { CalculatorSummaries } from "../src/summaries.js";

const CalculatorCatalogItems = EffectFunction.pipe(
  listCalculatorCatalogEntries(),
  Array.map(toCalculatorCatalogItem)
);
describe("calculator summaries", () => {
  it("shares every deployed summary with the API catalogue", () => {
    expect(CalculatorSummaries).toHaveLength(CalculatorCatalogItems.length);
    EffectFunction.pipe(
      CalculatorSummaries,
      Array.every(Schema.is(CalculatorSummary)),
      (actual) => {
        expect(actual).toBeTruthy();
      }
    );
    expect(CalculatorSummaries).toStrictEqual(
      expect.arrayContaining(
        EffectFunction.pipe(
          CalculatorCatalogItems,
          Array.map(Struct.pick(["calculatorId", "context", "title"]))
        )
      )
    );
  });
});
