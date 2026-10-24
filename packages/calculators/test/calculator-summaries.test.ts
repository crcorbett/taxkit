import { expect, it } from "@effect/vitest";
import { Array, Schema, Struct } from "effect";

import { CalculatorCatalogItems } from "../src/metadata.js";
import { CalculatorSummary } from "../src/schemas.js";
import { CalculatorSummaries } from "../src/summaries.js";

it("shares every deployed summary with the API catalogue", () => {
  expect(CalculatorSummaries).toHaveLength(CalculatorCatalogItems.length);
  expect(Array.every(CalculatorSummaries, Schema.is(CalculatorSummary))).toBe(
    true
  );
  expect(CalculatorSummaries).toEqual(
    expect.arrayContaining(
      Array.map(
        CalculatorCatalogItems,
        Struct.pick(["calculatorId", "context", "title"])
      )
    )
  );
});
