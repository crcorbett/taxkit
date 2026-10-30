import { describe, expect, it } from "@effect/vitest";
import { Cents, TaxRate } from "@taxkit/core/primitives";
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
  MedicareLevyArtifact2025_26,
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
            input: {
              ...Struct.pick(row, Struct.keys(IncomeTaxBracket.fields)),
              thresholdCents: Cents.make(-1),
            },
            name: "negative threshold",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(IncomeTaxBracket.fields)),
              baseTaxCents: Cents.make(-1),
            },
            name: "negative amount",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(IncomeTaxBracket.fields)),
              maxCents: row.thresholdCents,
            },
            name: "empty range",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(IncomeTaxBracket.fields)),
              rate: TaxRate.make(BigDecimal.make(-1n, 1)),
            },
            name: "negative rate",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(IncomeTaxBracket.fields)),
              rate: TaxRate.make(BigDecimal.make(101n, 2)),
            },
            name: "rate above one",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(IncomeTaxBracket.fields)),
              rate: TaxRate.make(BigDecimal.make(1n, -Number.MAX_SAFE_INTEGER)),
            },
            name: "enormous rate",
          },
        ];
        yield* EffectFunction.pipe(
          cases,
          Effect.forEach((scenario) =>
            Effect.gen(function* () {
              const result = yield* IncomeTaxBracket.makeEffect(
                scenario.input
              ).pipe(Effect.result);
              EffectFunction.pipe(Result.isFailure(result), (argument1) => {
                EffectFunction.pipe(scenario.name, (argument2) => {
                  expect(argument1, argument2).toBeTruthy();
                });
              });
              EffectFunction.pipe(
                Schema.is(Schema.toEncoded(IncomeTaxBracket))(scenario.input),
                (argument3) => {
                  EffectFunction.pipe(scenario.name, (argument4) => {
                    expect(argument3, argument4).toBeFalsy();
                  });
                }
              );
            })
          )
        );
        const tiny = yield* IncomeTaxBracket.makeEffect({
          ...Struct.pick(row, Struct.keys(IncomeTaxBracket.fields)),
          rate: TaxRate.make(BigDecimal.make(1n, Number.MAX_SAFE_INTEGER)),
        });
        EffectFunction.pipe(Schema.is(IncomeTaxBracket)(tiny), (actual) => {
          expect(actual).toBeTruthy();
        });
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
          ...Struct.pick(second, Struct.keys(IncomeTaxBracket.fields)),
          thresholdCents: gapStart,
        });
        const overlap = yield* IncomeTaxBracket.makeEffect({
          ...Struct.pick(second, Struct.keys(IncomeTaxBracket.fields)),
          thresholdCents: overlapStart,
        });
        const closedTail = yield* IncomeTaxBracket.makeEffect({
          ...Struct.pick(last, Struct.keys(IncomeTaxBracket.fields)),
          maxCents: tailEnd,
        });
        const missingStart = yield* IncomeTaxBracket.makeEffect({
          ...Struct.pick(first, Struct.keys(IncomeTaxBracket.fields)),
          thresholdCents: Cents.make(1),
        });
        const openMiddle = yield* IncomeTaxBracket.makeEffect({
          ...Struct.pick(first, Struct.keys(IncomeTaxBracket.fields)),
          maxCents: "infinity",
        });
        const cases = [
          { brackets: [], name: "empty table" },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(1, () => gap),
                  Match.orElse(() => row)
                )
              )
            ),
            name: "gap",
          },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(1, () => overlap),
                  Match.orElse(() => row)
                )
              )
            ),
            name: "overlap",
          },
          { brackets: Array.reverse(table.brackets), name: "reversed" },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(0, () => openMiddle),
                  Match.orElse(() => row)
                )
              )
            ),
            name: "open middle",
          },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                EffectBoolean.match(index === table.brackets.length - 1, {
                  onFalse: () => row,
                  onTrue: () => closedTail,
                })
              )
            ),
            name: "closed tail",
          },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(0, () => missingStart),
                  Match.orElse(() => row)
                )
              )
            ),
            name: "missing zero threshold",
          },
        ];
        yield* EffectFunction.pipe(
          cases,
          Effect.forEach((scenario) =>
            Effect.gen(function* () {
              const input = {
                ...Struct.pick(table, Struct.keys(IncomeTaxTable.fields)),
                brackets: scenario.brackets,
              };
              const result = yield* IncomeTaxTable.makeEffect(input).pipe(
                Effect.result
              );
              EffectFunction.pipe(Result.isFailure(result), (argument5) => {
                EffectFunction.pipe(scenario.name, (argument6) => {
                  expect(argument5, argument6).toBeTruthy();
                });
              });
              EffectFunction.pipe(
                Schema.is(Schema.toEncoded(IncomeTaxTable))(input),
                (argument7) => {
                  EffectFunction.pipe(scenario.name, (argument8) => {
                    expect(argument7, argument8).toBeFalsy();
                  });
                }
              );
            })
          )
        );
        EffectFunction.pipe(Schema.is(IncomeTaxTable)(table), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(
          Schema.is(Schema.toEncoded(IncomeTaxTable))(table),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
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
            input: {
              ...Struct.pick(row, Struct.keys(LitoBracket.fields)),
              thresholdCents: Cents.make(-1),
            },
            name: "negative threshold",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(LitoBracket.fields)),
              fullOffsetCents: Cents.make(-1),
            },
            name: "negative amount",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(LitoBracket.fields)),
              maxCents: row.thresholdCents,
            },
            name: "empty range",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(LitoBracket.fields)),
              phaseOutRate: TaxRate.make(BigDecimal.make(-1n, 1)),
            },
            name: "negative rate",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(LitoBracket.fields)),
              phaseOutRate: TaxRate.make(BigDecimal.make(101n, 2)),
            },
            name: "rate above one",
          },
          {
            input: {
              ...Struct.pick(row, Struct.keys(LitoBracket.fields)),
              phaseOutRate: TaxRate.make(
                BigDecimal.make(1n, -Number.MAX_SAFE_INTEGER)
              ),
            },
            name: "enormous rate",
          },
        ];
        yield* EffectFunction.pipe(
          cases,
          Effect.forEach((scenario) =>
            Effect.gen(function* () {
              const result = yield* LitoBracket.makeEffect(scenario.input).pipe(
                Effect.result
              );
              EffectFunction.pipe(Result.isFailure(result), (argument9) => {
                EffectFunction.pipe(scenario.name, (argument10) => {
                  expect(argument9, argument10).toBeTruthy();
                });
              });
              EffectFunction.pipe(
                Schema.is(Schema.toEncoded(LitoBracket))(scenario.input),
                (argument11) => {
                  EffectFunction.pipe(scenario.name, (argument12) => {
                    expect(argument11, argument12).toBeFalsy();
                  });
                }
              );
            })
          )
        );
        const tiny = yield* LitoBracket.makeEffect({
          ...Struct.pick(row, Struct.keys(LitoBracket.fields)),
          phaseOutRate: TaxRate.make(
            BigDecimal.make(1n, Number.MAX_SAFE_INTEGER)
          ),
        });
        EffectFunction.pipe(Schema.is(LitoBracket)(tiny), (actual) => {
          expect(actual).toBeTruthy();
        });
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
          ...Struct.pick(second, Struct.keys(LitoBracket.fields)),
          thresholdCents: gapStart,
        });
        const overlap = yield* LitoBracket.makeEffect({
          ...Struct.pick(second, Struct.keys(LitoBracket.fields)),
          thresholdCents: overlapStart,
        });
        const closedTail = yield* LitoBracket.makeEffect({
          ...Struct.pick(last, Struct.keys(LitoBracket.fields)),
          maxCents: tailEnd,
        });
        const missingStart = yield* LitoBracket.makeEffect({
          ...Struct.pick(first, Struct.keys(LitoBracket.fields)),
          thresholdCents: Cents.make(1),
        });
        const openMiddle = yield* LitoBracket.makeEffect({
          ...Struct.pick(first, Struct.keys(LitoBracket.fields)),
          maxCents: "infinity",
        });
        const cases = [
          { brackets: [], name: "empty table" },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(1, () => gap),
                  Match.orElse(() => row)
                )
              )
            ),
            name: "gap",
          },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(1, () => overlap),
                  Match.orElse(() => row)
                )
              )
            ),
            name: "overlap",
          },
          { brackets: Array.reverse(table.brackets), name: "reversed" },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(0, () => openMiddle),
                  Match.orElse(() => row)
                )
              )
            ),
            name: "open middle",
          },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                EffectBoolean.match(index === table.brackets.length - 1, {
                  onFalse: () => row,
                  onTrue: () => closedTail,
                })
              )
            ),
            name: "closed tail",
          },
          {
            brackets: EffectFunction.pipe(
              table.brackets,
              Array.map((row, index) =>
                Match.value(index).pipe(
                  Match.when(0, () => missingStart),
                  Match.orElse(() => row)
                )
              )
            ),
            name: "missing zero threshold",
          },
        ];
        yield* EffectFunction.pipe(
          cases,
          Effect.forEach((scenario) =>
            Effect.gen(function* () {
              const input = {
                ...Struct.pick(table, Struct.keys(LitoTable.fields)),
                brackets: scenario.brackets,
              };
              const result = yield* LitoTable.makeEffect(input).pipe(
                Effect.result
              );
              EffectFunction.pipe(Result.isFailure(result), (argument13) => {
                EffectFunction.pipe(scenario.name, (argument14) => {
                  expect(argument13, argument14).toBeTruthy();
                });
              });
              EffectFunction.pipe(
                Schema.is(Schema.toEncoded(LitoTable))(input),
                (argument15) => {
                  EffectFunction.pipe(scenario.name, (argument16) => {
                    expect(argument15, argument16).toBeFalsy();
                  });
                }
              );
            })
          )
        );
        EffectFunction.pipe(Schema.is(LitoTable)(table), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(
          Schema.is(Schema.toEncoded(LitoTable))(table),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
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
            input: {
              ...Struct.pick(table, Struct.keys(MedicareLevyTable.fields)),
              thresholdCents: Cents.make(-1),
            },
            name: "negative threshold",
          },
          {
            input: {
              ...Struct.pick(table, Struct.keys(MedicareLevyTable.fields)),
              shadeInMaxCents: table.thresholdCents,
            },
            name: "equal thresholds",
          },
          {
            input: {
              ...Struct.pick(table, Struct.keys(MedicareLevyTable.fields)),
              shadeInMaxCents: table.thresholdCents,
              thresholdCents: table.shadeInMaxCents,
            },
            name: "reversed thresholds",
          },
          {
            input: {
              ...Struct.pick(table, Struct.keys(MedicareLevyTable.fields)),
              levyRate: TaxRate.make(BigDecimal.make(0n, 0)),
            },
            name: "zero levy rate",
          },
          {
            input: {
              ...Struct.pick(table, Struct.keys(MedicareLevyTable.fields)),
              levyRate: TaxRate.make(BigDecimal.make(-1n, 2)),
            },
            name: "negative levy rate",
          },
          {
            input: {
              ...Struct.pick(table, Struct.keys(MedicareLevyTable.fields)),
              shadeInRate: TaxRate.make(BigDecimal.make(1n, 2)),
            },
            name: "shade-in below full levy",
          },
          {
            input: {
              ...Struct.pick(table, Struct.keys(MedicareLevyTable.fields)),
              shadeInRate: TaxRate.make(BigDecimal.make(101n, 2)),
            },
            name: "shade-in above one",
          },
          {
            input: {
              ...Struct.pick(table, Struct.keys(MedicareLevyTable.fields)),
              shadeInRate: TaxRate.make(
                BigDecimal.make(1n, -Number.MAX_SAFE_INTEGER)
              ),
            },
            name: "enormous shade-in rate",
          },
        ];
        yield* EffectFunction.pipe(
          cases,
          Effect.forEach((scenario) =>
            Effect.gen(function* () {
              const result = yield* MedicareLevyTable.makeEffect(
                scenario.input
              ).pipe(Effect.result);
              EffectFunction.pipe(Result.isFailure(result), (argument17) => {
                EffectFunction.pipe(scenario.name, (argument18) => {
                  expect(argument17, argument18).toBeTruthy();
                });
              });
              EffectFunction.pipe(
                Schema.is(Schema.toEncoded(MedicareLevyTable))(scenario.input),
                (argument19) => {
                  EffectFunction.pipe(scenario.name, (argument20) => {
                    expect(argument19, argument20).toBeFalsy();
                  });
                }
              );
            })
          )
        );
        expect(table.year).toBe("2025-26");
        EffectFunction.pipe(BigDecimal.format(table.levyRate), (actual) => {
          expect(actual).toBe("0.02");
        });
        EffectFunction.pipe(BigDecimal.format(table.shadeInRate), (actual) => {
          expect(actual).toBe("0.1");
        });
        expect({
          MedicareLevyArtifact2025_26DocumentVersion:
            MedicareLevyArtifact2025_26.documentVersion,
          MedicareLevyArtifact2025_26Checksum:
            MedicareLevyArtifact2025_26.checksum,
          MedicareLevyArtifact2025_26RetrievedOn:
            MedicareLevyArtifact2025_26.retrievedOn,
          tableThresholdCents: table.thresholdCents,
          tableShadeInMaxCents: table.shadeInMaxCents,
        }).toStrictEqual({
          MedicareLevyArtifact2025_26DocumentVersion:
            "C2026A00058/asmade; Schedule 5",
          MedicareLevyArtifact2025_26Checksum:
            "sha256:8298b458c6a579ffad9305acf5b4604255c928313654eea58e495164e4478b67",
          MedicareLevyArtifact2025_26RetrievedOn: "2026-10-08",
          tableThresholdCents: 2_801_100,
          tableShadeInMaxCents: 3_501_300,
        });
        EffectFunction.pipe(
          Schema.is(Schema.toEncoded(MedicareLevyTable))(table),
          (actual) => {
            expect(actual).toBeTruthy();
          }
        );
      }).pipe(Effect.provide(AtoMedicareLevy_2025_26_Live))
  );
});
