import { describe, expect, it } from "@effect/vitest";
import { Cents, TaxRate } from "@taxkit/core/primitives";
import { expectAt } from "@taxkit/testing";
import { Array, BigDecimal, Effect, Result, Schema } from "effect";

import {
  AtoIncomeTaxTable,
  AtoIncomeTax_2025_26_Live,
  IncomeTaxBracket,
  IncomeTaxTable,
} from "../src/parameters/income-tax-table.js";
import {
  AtoLitoTable,
  AtoLito_2025_26_Live,
  LitoBracket,
  LitoTable,
} from "../src/parameters/lito-table.js";
import {
  AtoMedicareLevyTable,
  AtoMedicareLevy_2025_26_Live,
  MedicareLevyTable,
} from "../src/parameters/medicare-levy-table.js";

describe("IncomeTaxTable owned relationships", () => {
  it.effect(
    "rejects malformed brackets in construction and saved representation",
    () =>
      Effect.gen(function* () {
        const table = yield* AtoIncomeTaxTable;
        const row = expectAt(table.brackets, 1);
        const cases = [
          {
            input: { ...row, thresholdCents: Cents.make(-1) },
            name: "negative threshold",
          },
          {
            input: { ...row, baseTaxCents: Cents.make(-1) },
            name: "negative amount",
          },
          {
            input: { ...row, maxCents: row.thresholdCents },
            name: "empty range",
          },
          {
            input: { ...row, rate: TaxRate.make(BigDecimal.make(-1n, 1)) },
            name: "negative rate",
          },
          {
            input: { ...row, rate: TaxRate.make(BigDecimal.make(101n, 2)) },
            name: "rate above one",
          },
          {
            input: {
              ...row,
              rate: TaxRate.make(BigDecimal.make(1n, -Number.MAX_SAFE_INTEGER)),
            },
            name: "enormous rate",
          },
        ];
        yield* Effect.forEach(cases, (scenario) =>
          Effect.gen(function* () {
            const result = yield* IncomeTaxBracket.makeEffect(
              scenario.input
            ).pipe(Effect.result);
            expect(Result.isFailure(result), scenario.name).toBe(true);
            expect(
              Schema.is(Schema.toEncoded(IncomeTaxBracket))(scenario.input),
              scenario.name
            ).toBe(false);
          })
        );
        const tiny = yield* IncomeTaxBracket.makeEffect({
          ...row,
          rate: TaxRate.make(BigDecimal.make(1n, Number.MAX_SAFE_INTEGER)),
        });
        expect(Schema.is(IncomeTaxBracket)(tiny)).toBe(true);
      }).pipe(Effect.provide(AtoIncomeTax_2025_26_Live))
  );

  it.effect(
    "rejects gaps, overlaps and open middle bounds in the saved table representation",
    () =>
      Effect.gen(function* () {
        const table = yield* AtoIncomeTaxTable;
        const first = expectAt(table.brackets, 0);
        const second = expectAt(table.brackets, 1);
        const last = expectAt(table.brackets, table.brackets.length - 1);
        const gapStart = yield* Cents.makeEffect(second.thresholdCents + 1);
        const overlapStart = yield* Cents.makeEffect(second.thresholdCents - 1);
        const tailEnd = yield* Cents.makeEffect(last.thresholdCents + 100);
        const gap = yield* IncomeTaxBracket.makeEffect({
          ...second,
          thresholdCents: gapStart,
        });
        const overlap = yield* IncomeTaxBracket.makeEffect({
          ...second,
          thresholdCents: overlapStart,
        });
        const closedTail = yield* IncomeTaxBracket.makeEffect({
          ...last,
          maxCents: tailEnd,
        });
        const missingStart = yield* IncomeTaxBracket.makeEffect({
          ...first,
          thresholdCents: Cents.make(1),
        });
        const openMiddle = yield* IncomeTaxBracket.makeEffect({
          ...first,
          maxCents: "infinity",
        });
        const cases = [
          { brackets: [], name: "empty table" },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === 1 ? gap : row
            ),
            name: "gap",
          },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === 1 ? overlap : row
            ),
            name: "overlap",
          },
          { brackets: Array.reverse(table.brackets), name: "reversed" },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === 0 ? openMiddle : row
            ),
            name: "open middle",
          },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === table.brackets.length - 1 ? closedTail : row
            ),
            name: "closed tail",
          },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === 0 ? missingStart : row
            ),
            name: "missing zero threshold",
          },
        ];
        yield* Effect.forEach(cases, (scenario) =>
          Effect.gen(function* () {
            const input = { ...table, brackets: scenario.brackets };
            const result = yield* IncomeTaxTable.makeEffect(input).pipe(
              Effect.result
            );
            expect(Result.isFailure(result), scenario.name).toBe(true);
            expect(
              Schema.is(Schema.toEncoded(IncomeTaxTable))(input),
              scenario.name
            ).toBe(false);
          })
        );
        expect(Schema.is(IncomeTaxTable)(table)).toBe(true);
        expect(Schema.is(Schema.toEncoded(IncomeTaxTable))(table)).toBe(true);
      }).pipe(Effect.provide(AtoIncomeTax_2025_26_Live))
  );
});

describe("LitoTable owned relationships", () => {
  it.effect(
    "rejects malformed brackets in construction and saved representation",
    () =>
      Effect.gen(function* () {
        const table = yield* AtoLitoTable;
        const row = expectAt(table.brackets, 1);
        const cases = [
          {
            input: { ...row, thresholdCents: Cents.make(-1) },
            name: "negative threshold",
          },
          {
            input: { ...row, fullOffsetCents: Cents.make(-1) },
            name: "negative amount",
          },
          {
            input: { ...row, maxCents: row.thresholdCents },
            name: "empty range",
          },
          {
            input: {
              ...row,
              phaseOutRate: TaxRate.make(BigDecimal.make(-1n, 1)),
            },
            name: "negative rate",
          },
          {
            input: {
              ...row,
              phaseOutRate: TaxRate.make(BigDecimal.make(101n, 2)),
            },
            name: "rate above one",
          },
          {
            input: {
              ...row,
              phaseOutRate: TaxRate.make(
                BigDecimal.make(1n, -Number.MAX_SAFE_INTEGER)
              ),
            },
            name: "enormous rate",
          },
        ];
        yield* Effect.forEach(cases, (scenario) =>
          Effect.gen(function* () {
            const result = yield* LitoBracket.makeEffect(scenario.input).pipe(
              Effect.result
            );
            expect(Result.isFailure(result), scenario.name).toBe(true);
            expect(
              Schema.is(Schema.toEncoded(LitoBracket))(scenario.input),
              scenario.name
            ).toBe(false);
          })
        );
        const tiny = yield* LitoBracket.makeEffect({
          ...row,
          phaseOutRate: TaxRate.make(
            BigDecimal.make(1n, Number.MAX_SAFE_INTEGER)
          ),
        });
        expect(Schema.is(LitoBracket)(tiny)).toBe(true);
      }).pipe(Effect.provide(AtoLito_2025_26_Live))
  );

  it.effect(
    "rejects gaps, overlaps and open middle bounds in the saved table representation",
    () =>
      Effect.gen(function* () {
        const table = yield* AtoLitoTable;
        const first = expectAt(table.brackets, 0);
        const second = expectAt(table.brackets, 1);
        const last = expectAt(table.brackets, table.brackets.length - 1);
        const gapStart = yield* Cents.makeEffect(second.thresholdCents + 1);
        const overlapStart = yield* Cents.makeEffect(second.thresholdCents - 1);
        const tailEnd = yield* Cents.makeEffect(last.thresholdCents + 100);
        const gap = yield* LitoBracket.makeEffect({
          ...second,
          thresholdCents: gapStart,
        });
        const overlap = yield* LitoBracket.makeEffect({
          ...second,
          thresholdCents: overlapStart,
        });
        const closedTail = yield* LitoBracket.makeEffect({
          ...last,
          maxCents: tailEnd,
        });
        const missingStart = yield* LitoBracket.makeEffect({
          ...first,
          thresholdCents: Cents.make(1),
        });
        const openMiddle = yield* LitoBracket.makeEffect({
          ...first,
          maxCents: "infinity",
        });
        const cases = [
          { brackets: [], name: "empty table" },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === 1 ? gap : row
            ),
            name: "gap",
          },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === 1 ? overlap : row
            ),
            name: "overlap",
          },
          { brackets: Array.reverse(table.brackets), name: "reversed" },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === 0 ? openMiddle : row
            ),
            name: "open middle",
          },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === table.brackets.length - 1 ? closedTail : row
            ),
            name: "closed tail",
          },
          {
            brackets: Array.map(table.brackets, (row, index) =>
              index === 0 ? missingStart : row
            ),
            name: "missing zero threshold",
          },
        ];
        yield* Effect.forEach(cases, (scenario) =>
          Effect.gen(function* () {
            const input = { ...table, brackets: scenario.brackets };
            const result = yield* LitoTable.makeEffect(input).pipe(
              Effect.result
            );
            expect(Result.isFailure(result), scenario.name).toBe(true);
            expect(
              Schema.is(Schema.toEncoded(LitoTable))(input),
              scenario.name
            ).toBe(false);
          })
        );
        expect(Schema.is(LitoTable)(table)).toBe(true);
        expect(Schema.is(Schema.toEncoded(LitoTable))(table)).toBe(true);
      }).pipe(Effect.provide(AtoLito_2025_26_Live))
  );
});

describe("MedicareLevyTable owned relationships", () => {
  it.effect(
    "rejects invalid threshold and rate relationships without correcting retained values",
    () =>
      Effect.gen(function* () {
        const table = yield* AtoMedicareLevyTable;
        const cases = [
          {
            input: { ...table, thresholdCents: Cents.make(-1) },
            name: "negative threshold",
          },
          {
            input: { ...table, shadeInMaxCents: table.thresholdCents },
            name: "equal thresholds",
          },
          {
            input: {
              ...table,
              shadeInMaxCents: table.thresholdCents,
              thresholdCents: table.shadeInMaxCents,
            },
            name: "reversed thresholds",
          },
          {
            input: { ...table, levyRate: TaxRate.make(BigDecimal.make(0n, 0)) },
            name: "zero levy rate",
          },
          {
            input: {
              ...table,
              levyRate: TaxRate.make(BigDecimal.make(-1n, 2)),
            },
            name: "negative levy rate",
          },
          {
            input: {
              ...table,
              shadeInRate: TaxRate.make(BigDecimal.make(1n, 2)),
            },
            name: "shade-in below full levy",
          },
          {
            input: {
              ...table,
              shadeInRate: TaxRate.make(BigDecimal.make(101n, 2)),
            },
            name: "shade-in above one",
          },
          {
            input: {
              ...table,
              shadeInRate: TaxRate.make(
                BigDecimal.make(1n, -Number.MAX_SAFE_INTEGER)
              ),
            },
            name: "enormous shade-in rate",
          },
        ];
        yield* Effect.forEach(cases, (scenario) =>
          Effect.gen(function* () {
            const result = yield* MedicareLevyTable.makeEffect(
              scenario.input
            ).pipe(Effect.result);
            expect(Result.isFailure(result), scenario.name).toBe(true);
            expect(
              Schema.is(Schema.toEncoded(MedicareLevyTable))(scenario.input),
              scenario.name
            ).toBe(false);
          })
        );
        expect(table.thresholdCents).toBe(2_722_200);
        expect(table.shadeInMaxCents).toBe(3_402_700);
        expect(Schema.is(Schema.toEncoded(MedicareLevyTable))(table)).toBe(
          true
        );
      }).pipe(Effect.provide(AtoMedicareLevy_2025_26_Live))
  );
});
