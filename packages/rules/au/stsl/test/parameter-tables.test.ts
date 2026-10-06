import { describe, expect, it } from "@effect/vitest";
import { Cents, DecimalCoefficient } from "@taxkit/core/primitives";
import { expectAt } from "@taxkit/testing";
import { Array, BigDecimal, Effect, Result, Schema } from "effect";

import {
  StslTable,
  StslRow,
  AtoStslTable,
  AtoStsl_2025_26_Live,
} from "../src/parameters/stsl-table.js";

describe("StslTable owned relationships", () => {
  it.effect(
    "rejects malformed inclusive rows in construction and saved representation",
    () =>
      Effect.gen(function* () {
        const table = yield* AtoStslTable;
        const row = expectAt(table.rows, 1);
        const reversedEnd = yield* Cents.makeEffect(row.weeklyMinCents - 1);
        const cases = [
          {
            input: { ...row, weeklyMinCents: Cents.make(-1) },
            name: "negative start",
          },
          {
            input: { ...row, weeklyMaxCents: reversedEnd },
            name: "reversed range",
          },
          {
            input: {
              ...row,
              a: DecimalCoefficient.make(BigDecimal.make(-1n, 1)),
            },
            name: "negative multiplier",
          },
          {
            input: {
              ...row,
              a: DecimalCoefficient.make(BigDecimal.make(101n, 2)),
            },
            name: "multiplier above one",
          },
          {
            input: {
              ...row,
              a: DecimalCoefficient.make(
                BigDecimal.make(1n, -Number.MAX_SAFE_INTEGER)
              ),
            },
            name: "enormous multiplier",
          },
        ];
        yield* Effect.forEach(cases, (scenario) =>
          Effect.gen(function* () {
            const result = yield* StslRow.makeEffect(scenario.input).pipe(
              Effect.result
            );
            expect(Result.isFailure(result), scenario.name).toBe(true);
            expect(
              Schema.is(Schema.toEncoded(StslRow))(scenario.input),
              scenario.name
            ).toBe(false);
          })
        );
        const point = yield* StslRow.makeEffect({
          ...row,
          weeklyMaxCents: row.weeklyMinCents,
        });
        expect(Schema.is(StslRow)(point)).toBe(true);
        expect(Schema.is(Schema.toEncoded(StslRow))(point)).toBe(true);
        const tiny = yield* StslRow.makeEffect({
          ...row,
          a: DecimalCoefficient.make(
            BigDecimal.make(1n, Number.MAX_SAFE_INTEGER)
          ),
        });
        expect(Schema.is(StslRow)(tiny)).toBe(true);
      }).pipe(Effect.provide(AtoStsl_2025_26_Live))
  );

  it.effect(
    "rejects gaps, overlaps and open middle bounds in the saved table representation",
    () =>
      Effect.gen(function* () {
        const table = yield* AtoStslTable;
        const first = expectAt(table.rows, 0);
        const second = expectAt(table.rows, 1);
        const last = expectAt(table.rows, table.rows.length - 1);
        const gapStart = yield* Cents.makeEffect(second.weeklyMinCents + 1);
        const overlapStart = yield* Cents.makeEffect(second.weeklyMinCents - 1);
        const tailEnd = yield* Cents.makeEffect(last.weeklyMinCents + 100);
        const gap = yield* StslRow.makeEffect({
          ...second,
          weeklyMinCents: gapStart,
        });
        const overlap = yield* StslRow.makeEffect({
          ...second,
          weeklyMinCents: overlapStart,
        });
        const closedTail = yield* StslRow.makeEffect({
          ...last,
          weeklyMaxCents: tailEnd,
        });
        const missingStart = yield* StslRow.makeEffect({
          ...first,
          weeklyMinCents: Cents.make(1),
        });
        const openMiddle = yield* StslRow.makeEffect({
          ...first,
          weeklyMaxCents: "infinity",
        });
        const cases = [
          { name: "empty table", rows: [] },
          {
            name: "gap",
            rows: Array.map(table.rows, (row, index) =>
              index === 1 ? gap : row
            ),
          },
          {
            name: "overlap",
            rows: Array.map(table.rows, (row, index) =>
              index === 1 ? overlap : row
            ),
          },
          { name: "reversed", rows: Array.reverse(table.rows) },
          {
            name: "open middle",
            rows: Array.map(table.rows, (row, index) =>
              index === 0 ? openMiddle : row
            ),
          },
          {
            name: "closed tail",
            rows: Array.map(table.rows, (row, index) =>
              index === table.rows.length - 1 ? closedTail : row
            ),
          },
          {
            name: "missing zero start",
            rows: Array.map(table.rows, (row, index) =>
              index === 0 ? missingStart : row
            ),
          },
        ];
        yield* Effect.forEach(cases, (scenario) =>
          Effect.gen(function* () {
            const input = { ...table, rows: scenario.rows };
            const result = yield* StslTable.makeEffect(input).pipe(
              Effect.result
            );
            expect(Result.isFailure(result), scenario.name).toBe(true);
            expect(
              Schema.is(Schema.toEncoded(StslTable))(input),
              scenario.name
            ).toBe(false);
          })
        );
        expect(Schema.is(StslTable)(table)).toBe(true);
        expect(Schema.is(Schema.toEncoded(StslTable))(table)).toBe(true);
      }).pipe(Effect.provide(AtoStsl_2025_26_Live))
  );
});
