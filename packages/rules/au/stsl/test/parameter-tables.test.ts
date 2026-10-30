import { describe, expect, it } from "@effect/vitest";
import { Cents, DecimalCoefficient } from "@taxkit/core/primitives";
import { expectAt } from "@taxkit/testing";
import {
  Match,
  Function as EffectFunction,
  Array,
  BigDecimal,
  Effect,
  Result,
  Schema,
  Struct,
  Boolean as EffectBoolean,
} from "effect";

import {
  StslTable,
  StslRow,
  AtoStslTable,
  AtoStslNoThresholdTable,
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
            input: {
              ...Struct.pick(row, Struct.keys(StslRow.fields)),
              weeklyMinCents: Cents.make(-1),
            },
            name: "negative start",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(StslRow.fields)),
              weeklyMaxCents: reversedEnd,
            },
            name: "reversed range",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(StslRow.fields)),
              a: DecimalCoefficient.make(BigDecimal.make(-1n, 1)),
            },
            name: "negative multiplier",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(StslRow.fields)),
              a: DecimalCoefficient.make(BigDecimal.make(101n, 2)),
            },
            name: "multiplier above one",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(StslRow.fields)),
              a: DecimalCoefficient.make(
                BigDecimal.make(1n, -Number.MAX_SAFE_INTEGER)
              ),
            },
            name: "enormous multiplier",
          },
        ];
        yield* EffectFunction.pipe(
          cases,
          Effect.forEach((scenario) =>
            Effect.gen(function* () {
              const result = yield* StslRow.makeEffect(scenario.input).pipe(
                Effect.result
              );
              EffectFunction.pipe(Result.isFailure(result), (argument1) => {
                EffectFunction.pipe(scenario.name, (argument2) => {
                  expect(argument1, argument2).toBeTruthy();
                });
              });
              EffectFunction.pipe(
                Schema.is(Schema.toEncoded(StslRow))(scenario.input),
                (argument3) => {
                  EffectFunction.pipe(scenario.name, (argument4) => {
                    expect(argument3, argument4).toBeFalsy();
                  });
                }
              );
            })
          )
        );
        const point = yield* StslRow.makeEffect({
          ...Struct.pick(row, Struct.keys(StslRow.fields)),
          weeklyMaxCents: row.weeklyMinCents,
        });
        EffectFunction.pipe(Schema.is(StslRow)(point), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(
          Schema.is(Schema.toEncoded(StslRow))(point),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
        const tiny = yield* StslRow.makeEffect({
          ...Struct.pick(row, Struct.keys(StslRow.fields)),
          a: DecimalCoefficient.make(
            BigDecimal.make(1n, Number.MAX_SAFE_INTEGER)
          ),
        });
        EffectFunction.pipe(Schema.is(StslRow)(tiny), (actual) => {
          expect(actual).toBeTruthy();
        });
      }).pipe(Effect.provide(AtoStsl_2025_26_Live))
  );
  it.effect.each([AtoStslTable, AtoStslNoThresholdTable])(
    "rejects gaps, overlaps and open middle bounds in each saved table",
    (tableService) =>
      Effect.gen(function* () {
        const table = yield* tableService;
        const first = expectAt(table.rows, 0);
        const second = expectAt(table.rows, 1);
        const last = expectAt(table.rows, table.rows.length - 1);
        const gapStart = yield* Cents.makeEffect(second.weeklyMinCents + 1);
        const overlapStart = yield* Cents.makeEffect(second.weeklyMinCents - 1);
        const tailEnd = yield* Cents.makeEffect(last.weeklyMinCents + 100);
        const gap = yield* StslRow.makeEffect({
          ...Struct.pick(second, Struct.keys(StslRow.fields)),
          weeklyMinCents: gapStart,
        });
        const overlap = yield* StslRow.makeEffect({
          ...Struct.pick(second, Struct.keys(StslRow.fields)),
          weeklyMinCents: overlapStart,
        });
        const closedTail = yield* StslRow.makeEffect({
          ...Struct.pick(last, Struct.keys(StslRow.fields)),
          weeklyMaxCents: tailEnd,
        });
        const missingStart = yield* StslRow.makeEffect({
          ...Struct.pick(first, Struct.keys(StslRow.fields)),
          weeklyMinCents: Cents.make(1),
        });
        const openMiddle = yield* StslRow.makeEffect({
          ...Struct.pick(first, Struct.keys(StslRow.fields)),
          weeklyMaxCents: "infinity",
        });
        const cases = [
          { name: "empty table", rows: [] },
          {
            name: "gap",
            rows: EffectFunction.pipe(
              table.rows,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(1, () => gap),
                  Match.orElse(() => row)
                )
              )
            ),
          },
          {
            name: "overlap",
            rows: EffectFunction.pipe(
              table.rows,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(1, () => overlap),
                  Match.orElse(() => row)
                )
              )
            ),
          },
          { name: "reversed", rows: Array.reverse(table.rows) },
          {
            name: "open middle",
            rows: EffectFunction.pipe(
              table.rows,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(0, () => openMiddle),
                  Match.orElse(() => row)
                )
              )
            ),
          },
          {
            name: "closed tail",
            rows: EffectFunction.pipe(
              table.rows,
              Array.map((row, index) =>
                EffectBoolean.match(index === table.rows.length - 1, {
                  onFalse: () => row,
                  onTrue: () => closedTail,
                })
              )
            ),
          },
          {
            name: "missing zero start",
            rows: EffectFunction.pipe(
              table.rows,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(0, () => missingStart),
                  Match.orElse(() => row)
                )
              )
            ),
          },
        ];
        yield* EffectFunction.pipe(
          cases,
          Effect.forEach((scenario) =>
            Effect.gen(function* () {
              const input = {
                ...Struct.pick(table, Struct.keys(StslTable.fields)),
                rows: scenario.rows,
              };
              const result = yield* StslTable.makeEffect(input).pipe(
                Effect.result
              );
              EffectFunction.pipe(Result.isFailure(result), (argument5) => {
                EffectFunction.pipe(scenario.name, (argument6) => {
                  expect(argument5, argument6).toBeTruthy();
                });
              });
              EffectFunction.pipe(
                Schema.is(Schema.toEncoded(StslTable))(input),
                (argument7) => {
                  EffectFunction.pipe(scenario.name, (argument8) => {
                    expect(argument7, argument8).toBeFalsy();
                  });
                }
              );
            })
          )
        );
        EffectFunction.pipe(Schema.is(StslTable)(table), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(
          Schema.is(Schema.toEncoded(StslTable))(table),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
      }).pipe(Effect.provide(AtoStsl_2025_26_Live))
  );
});
