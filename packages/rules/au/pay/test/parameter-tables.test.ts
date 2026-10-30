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
            input: {
              ...Struct.pick(row, Struct.keys(Schedule1Row.fields)),
              weeklyMinCents: Cents.make(-1),
            },
            name: "negative start",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(Schedule1Row.fields)),
              weeklyMaxCents: reversedEnd,
            },
            name: "reversed range",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(Schedule1Row.fields)),
              a: DecimalCoefficient.make(BigDecimal.make(-1n, 1)),
            },
            name: "negative multiplier",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(Schedule1Row.fields)),
              a: DecimalCoefficient.make(BigDecimal.make(101n, 2)),
            },
            name: "multiplier above one",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(Schedule1Row.fields)),
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
              const result = yield* Schedule1Row.makeEffect(
                scenario.input
              ).pipe(Effect.result);
              EffectFunction.pipe(Result.isFailure(result), (argument1) => {
                EffectFunction.pipe(scenario.name, (argument2) => {
                  expect(argument1, argument2).toBeTruthy();
                });
              });
              EffectFunction.pipe(
                Schema.is(Schema.toEncoded(Schedule1Row))(scenario.input),
                (argument3) => {
                  EffectFunction.pipe(scenario.name, (argument4) => {
                    expect(argument3, argument4).toBeFalsy();
                  });
                }
              );
            })
          )
        );
        const point = yield* Schedule1Row.makeEffect({
          ...Struct.pick(row, Struct.keys(Schedule1Row.fields)),
          weeklyMaxCents: row.weeklyMinCents,
        });
        EffectFunction.pipe(Schema.is(Schedule1Row)(point), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(
          Schema.is(Schema.toEncoded(Schedule1Row))(point),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
        const tiny = yield* Schedule1Row.makeEffect({
          ...Struct.pick(row, Struct.keys(Schedule1Row.fields)),
          a: DecimalCoefficient.make(
            BigDecimal.make(1n, Number.MAX_SAFE_INTEGER)
          ),
        });
        EffectFunction.pipe(Schema.is(Schedule1Row)(tiny), (actual) => {
          expect(actual).toBeTruthy();
        });
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
          ...Struct.pick(second, Struct.keys(Schedule1Row.fields)),
          weeklyMinCents: gapStart,
        });
        const overlap = yield* Schedule1Row.makeEffect({
          ...Struct.pick(second, Struct.keys(Schedule1Row.fields)),
          weeklyMinCents: overlapStart,
        });
        const closedTail = yield* Schedule1Row.makeEffect({
          ...Struct.pick(last, Struct.keys(Schedule1Row.fields)),
          weeklyMaxCents: tailEnd,
        });
        const missingStart = yield* Schedule1Row.makeEffect({
          ...Struct.pick(first, Struct.keys(Schedule1Row.fields)),
          weeklyMinCents: Cents.make(1),
        });
        const openMiddle = yield* Schedule1Row.makeEffect({
          ...Struct.pick(first, Struct.keys(Schedule1Row.fields)),
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
          {
            name: "missing scale1",
            rows: EffectFunction.pipe(
              table.rows,
              Array.filter((row) => row.scale !== "scale1")
            ),
          },
          {
            name: "missing scale2",
            rows: EffectFunction.pipe(
              table.rows,
              Array.filter((row) => row.scale !== "scale2")
            ),
          },
        ];
        yield* EffectFunction.pipe(
          cases,
          Effect.forEach((scenario) =>
            Effect.gen(function* () {
              const input = {
                ...Struct.pick(table, Struct.keys(Schedule1Table.fields)),
                rows: scenario.rows,
              };
              const result = yield* Schedule1Table.makeEffect(input).pipe(
                Effect.result
              );
              EffectFunction.pipe(Result.isFailure(result), (argument5) => {
                EffectFunction.pipe(scenario.name, (argument6) => {
                  expect(argument5, argument6).toBeTruthy();
                });
              });
              EffectFunction.pipe(
                Schema.is(Schema.toEncoded(Schedule1Table))(input),
                (argument7) => {
                  EffectFunction.pipe(scenario.name, (argument8) => {
                    expect(argument7, argument8).toBeFalsy();
                  });
                }
              );
            })
          )
        );
        EffectFunction.pipe(Schema.is(Schedule1Table)(table), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(
          Schema.is(Schema.toEncoded(Schedule1Table))(table),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
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
        EffectFunction.pipe(Schema.is(Schedule1Table)(current), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(Schema.is(Schedule1Table)(previous), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(
          BigDecimal.Order(
            expectAt(current.rows, 2).bDollars,
            BigDecimal.make(0n, 0)
          ),
          (actual) => {
            expect(actual).toBeLessThan(0);
          }
        );
        const point = yield* Schedule1Row.makeEffect({
          ...Struct.pick(
            expectAt(current.rows, 0),
            Struct.keys(Schedule1Row.fields)
          ),
          weeklyMaxCents: Cents.make(0),
        });
        const next = yield* Schedule1Row.makeEffect({
          ...Struct.pick(
            expectAt(current.rows, 0),
            Struct.keys(Schedule1Row.fields)
          ),
          weeklyMaxCents: "infinity",
          weeklyMinCents: Cents.make(1),
        });
        const scale2 = yield* Schedule1Row.makeEffect({
          ...Struct.pick(
            expectAt(current.rows, 0),
            Struct.keys(Schedule1Row.fields)
          ),
          scale: "scale2",
          weeklyMaxCents: "infinity",
        });
        const interleaved = yield* Schedule1Table.makeEffect({
          ...Struct.pick(current, Struct.keys(Schedule1Table.fields)),
          rows: [point, scale2, next],
        });
        EffectFunction.pipe(
          Schema.is(Schema.toEncoded(Schedule1Table))(interleaved),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
      })
  );
});
