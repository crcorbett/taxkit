import { describe, expect, it } from "@effect/vitest";
import { Cents, DecimalCoefficient } from "@taxkit/core/primitives";
import { expectAt } from "@taxkit/testing";
import { Array, BigDecimal, Effect, Result, Schema } from "effect";

import {
  Schedule1Table,
  Schedule1Row,
  AtoSchedule1Table,
  AtoSchedule1_2025_26_Live,
  AtoSchedule1_2024_25_Live,
} from "../src/parameters/schedule1.js";

describe("Schedule1Table owned relationships", () => {
  it.effect(
    "rejects malformed inclusive rows in construction and saved representation",
    () =>
      Effect.gen(function* () {
        const table = yield* AtoSchedule1Table;
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
            const result = yield* Schedule1Row.makeEffect(scenario.input).pipe(
              Effect.result
            );
            expect(Result.isFailure(result), scenario.name).toBe(true);
            expect(
              Schema.is(Schema.toEncoded(Schedule1Row))(scenario.input),
              scenario.name
            ).toBe(false);
          })
        );
        const point = yield* Schedule1Row.makeEffect({
          ...row,
          weeklyMaxCents: row.weeklyMinCents,
        });
        expect(Schema.is(Schedule1Row)(point)).toBe(true);
        expect(Schema.is(Schema.toEncoded(Schedule1Row))(point)).toBe(true);
        const tiny = yield* Schedule1Row.makeEffect({
          ...row,
          a: DecimalCoefficient.make(
            BigDecimal.make(1n, Number.MAX_SAFE_INTEGER)
          ),
        });
        expect(Schema.is(Schedule1Row)(tiny)).toBe(true);
      }).pipe(Effect.provide(AtoSchedule1_2025_26_Live))
  );

  it.effect(
    "rejects gaps, overlaps and open middle bounds in the saved table representation",
    () =>
      Effect.gen(function* () {
        const table = yield* AtoSchedule1Table;
        const first = expectAt(table.rows, 0);
        const second = expectAt(table.rows, 1);
        const last = expectAt(table.rows, table.rows.length - 1);
        const gapStart = yield* Cents.makeEffect(second.weeklyMinCents + 1);
        const overlapStart = yield* Cents.makeEffect(second.weeklyMinCents - 1);
        const tailEnd = yield* Cents.makeEffect(last.weeklyMinCents + 100);
        const gap = yield* Schedule1Row.makeEffect({
          ...second,
          weeklyMinCents: gapStart,
        });
        const overlap = yield* Schedule1Row.makeEffect({
          ...second,
          weeklyMinCents: overlapStart,
        });
        const closedTail = yield* Schedule1Row.makeEffect({
          ...last,
          weeklyMaxCents: tailEnd,
        });
        const missingStart = yield* Schedule1Row.makeEffect({
          ...first,
          weeklyMinCents: Cents.make(1),
        });
        const openMiddle = yield* Schedule1Row.makeEffect({
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
          {
            name: "missing scale1",
            rows: Array.filter(table.rows, (row) => row.scale !== "scale1"),
          },
          {
            name: "missing scale2",
            rows: Array.filter(table.rows, (row) => row.scale !== "scale2"),
          },
        ];
        yield* Effect.forEach(cases, (scenario) =>
          Effect.gen(function* () {
            const input = { ...table, rows: scenario.rows };
            const result = yield* Schedule1Table.makeEffect(input).pipe(
              Effect.result
            );
            expect(Result.isFailure(result), scenario.name).toBe(true);
            expect(
              Schema.is(Schema.toEncoded(Schedule1Table))(input),
              scenario.name
            ).toBe(false);
          })
        );
        expect(Schema.is(Schedule1Table)(table)).toBe(true);
        expect(Schema.is(Schema.toEncoded(Schedule1Table))(table)).toBe(true);
      }).pipe(Effect.provide(AtoSchedule1_2025_26_Live))
  );

  it.effect(
    "retains both authored years and legitimate negative dollar coefficients",
    () =>
      Effect.gen(function* () {
        const current = yield* AtoSchedule1Table.pipe(
          Effect.provide(AtoSchedule1_2025_26_Live)
        );
        const previous = yield* AtoSchedule1Table.pipe(
          Effect.provide(AtoSchedule1_2024_25_Live)
        );
        expect(Schema.is(Schedule1Table)(current)).toBe(true);
        expect(Schema.is(Schedule1Table)(previous)).toBe(true);
        expect(
          BigDecimal.Order(
            expectAt(current.rows, 2).bDollars,
            BigDecimal.make(0n, 0)
          )
        ).toBeLessThan(0);
        const point = yield* Schedule1Row.makeEffect({
          ...expectAt(current.rows, 0),
          weeklyMaxCents: Cents.make(0),
        });
        const next = yield* Schedule1Row.makeEffect({
          ...expectAt(current.rows, 0),
          weeklyMaxCents: "infinity",
          weeklyMinCents: Cents.make(1),
        });
        const scale2 = yield* Schedule1Row.makeEffect({
          ...expectAt(current.rows, 0),
          scale: "scale2",
          weeklyMaxCents: "infinity",
        });
        const interleaved = yield* Schedule1Table.makeEffect({
          ...current,
          rows: [point, scale2, next],
        });
        expect(Schema.is(Schema.toEncoded(Schedule1Table))(interleaved)).toBe(
          true
        );
      })
  );
});
