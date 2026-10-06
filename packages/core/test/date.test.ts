import { describe, expect, it } from "@effect/vitest";
import { Effect, Option, Record, Result, Schema } from "effect";

import {
  AustralianTaxYear,
  DateInterval,
  IsoDate,
  australianTaxYearInterval,
  dateInterval,
  dateIntervalsOverlap,
  isoDate,
} from "../src/primitives/date.js";
import { InvalidCalendarValue } from "../src/primitives/errors.js";
import {
  SourceArtifact,
  SourceChecksum,
  SourceExtract,
  SourceRef,
} from "../src/trace/node.js";

const sourceArtifact = new SourceArtifact({
  checksum: SourceChecksum.make("sha256:test"),
  documentVersion: "test",
  extract: new SourceExtract({ rowContract: "TestRow[]", rowCount: 1 }),
  retrievedOn: IsoDate.make("2024-02-29"),
  source: SourceRef.make({
    kind: "internal-validation",
    reference: "test",
    title: "Test source",
  }),
});

const sourceArtifactInput = (retrievedOn: string) => ({
  ...sourceArtifact,
  retrievedOn,
});

const CalendarResult = Schema.Result(IsoDate, InvalidCalendarValue);

describe("IsoDate", () => {
  it.effect("keeps the branded Type and string Encoded representation", () =>
    Effect.gen(function* () {
      const value = yield* isoDate("2024-02-29");
      const encoded = yield* Schema.encodeEffect(IsoDate)(value);
      expect(value).toBe("2024-02-29");
      expect(encoded).toBe("2024-02-29");
      expect(Schema.is(Schema.toEncoded(IsoDate))(encoded)).toBe(true);
    })
  );

  it.effect.each(["2024-02-29", "2000-02-29", "2026-07-19"])(
    "accepts real Gregorian date %s through Schema and the fallible constructor",
    (value) =>
      Effect.gen(function* () {
        expect(Schema.is(IsoDate)(value)).toBe(true);
        expect(yield* isoDate(value)).toBe(value);
      })
  );

  it.effect.each([
    "2026-2-09",
    "2026-02-9",
    "2026-13-01",
    "2026-04-31",
    "2026-02-29",
    "1900-02-29",
    "0000-01-01",
    "private-calendar-sentinel",
  ])("returns a checked safe error for invalid date %s", (value) =>
    Effect.gen(function* () {
      expect(Schema.is(IsoDate)(value)).toBe(false);
      const result = yield* isoDate(value).pipe(Effect.result);
      expect(Result.isFailure(result)).toBe(true);
      const actual = yield* Schema.encodeEffect(CalendarResult)(result);
      const expected = yield* Schema.encodeEffect(CalendarResult)(
        Result.fail(new InvalidCalendarValue())
      );
      expect(actual).toEqual(expected);
    })
  );

  it.effect.each([
    { from: "2026-02-29", toExclusive: "2026-07-01" },
    { from: "2026-07-01", toExclusive: "2026-07-01" },
    { from: "2026-07-01", toExclusive: "2025-07-01" },
  ])(
    "checks real dates and start-before-end in the interval owner",
    (interval) =>
      Effect.gen(function* () {
        expect(Schema.is(Schema.toEncoded(DateInterval))(interval)).toBe(false);
        expect(
          Result.isFailure(yield* dateInterval(interval).pipe(Effect.result))
        ).toBe(true);
      })
  );

  it.effect(
    "preserves all historical optional-end representations and bytes",
    () =>
      Effect.gen(function* () {
        const samples = [
          {
            bytes: '{"from":"2025-07-01"}',
            input: { from: "2025-07-01" },
            own: false,
          },
          {
            bytes: '{"from":"2025-07-01"}',
            input: { from: "2025-07-01", toExclusive: undefined },
            own: true,
          },
          {
            bytes: '{"from":"2025-07-01","toExclusive":"2026-07-01"}',
            input: { from: "2025-07-01", toExclusive: "2026-07-01" },
            own: true,
          },
        ];
        yield* Effect.forEach(samples, (sample) =>
          Effect.gen(function* () {
            const value = yield* dateInterval(sample.input);
            const encoded = yield* Schema.encodeEffect(DateInterval)(value);
            const bytes = yield* Schema.encodeEffect(
              Schema.fromJsonString(DateInterval)
            )(value);
            expect(
              Record.has<string, string | undefined>(encoded, "toExclusive")
            ).toBe(sample.own);
            expect(bytes).toBe(sample.bytes);
            expect(Option.isSome(value.toExclusive)).toBe(sample.own);
            const restored = yield* Schema.decodeEffect(DateInterval)(encoded);
            expect(
              yield* Schema.encodeEffect(Schema.fromJsonString(DateInterval))(
                restored
              )
            ).toBe(sample.bytes);
          })
        );
      })
  );

  it.effect(
    "treats an absent end as unbounded, including the last supported day",
    () =>
      Effect.gen(function* () {
        const lastDay = yield* dateInterval({ from: "9999-12-31" });
        const earlierOpen = yield* dateInterval({ from: "9999-12-30" });
        const earlierFinite = yield* dateInterval({
          from: "9999-12-30",
          toExclusive: "9999-12-31",
        });
        expect(dateIntervalsOverlap(lastDay, lastDay)).toBe(true);
        expect(dateIntervalsOverlap(lastDay, earlierOpen)).toBe(true);
        expect(dateIntervalsOverlap(earlierOpen, lastDay)).toBe(true);
        expect(dateIntervalsOverlap(lastDay, earlierFinite)).toBe(false);
        expect(dateIntervalsOverlap(earlierFinite, lastDay)).toBe(false);
      })
  );

  it.effect(
    "retains the ordering check when constructing already decoded Option fields",
    () =>
      Effect.gen(function* () {
        const date = IsoDate.make("2026-07-01");
        const result = yield* DateInterval.makeEffect({
          from: date,
          toExclusive: Option.some(Option.some(date)),
        }).pipe(Effect.result);
        expect(Result.isFailure(result)).toBe(true);
      })
  );

  it.effect.each([
    { end: "2026-07-01", from: "2025-07-01", label: "2025-26" },
    { end: "2000-07-01", from: "1999-07-01", label: "1999-00" },
    { end: "0002-07-01", from: "0001-07-01", label: "0001-02" },
    { end: "9999-07-01", from: "9998-07-01", label: "9998-99" },
  ])("checks the entire Australian year label $label", ({ label, from, end }) =>
    Effect.gen(function* () {
      const value = yield* australianTaxYearInterval(label);
      expect(value.from).toBe(from);
      expect(Option.flatten(value.toExclusive)).toEqual(Option.some(end));
    })
  );

  it.effect.each([
    "2025",
    "2025-27",
    "2025-26-private-sentinel",
    "0000-01",
    "9999-00",
  ])("rejects a wrong or unrepresentable Australian year %s", (value) =>
    Effect.gen(function* () {
      expect(Schema.is(AustralianTaxYear)(value)).toBe(false);
      expect(
        Result.isFailure(
          yield* australianTaxYearInterval(value).pipe(Effect.result)
        )
      ).toBe(true);
    })
  );

  it("enforces the same calendar invariant inside SourceArtifact", () => {
    expect(
      Schema.is(Schema.toEncoded(SourceArtifact))(
        sourceArtifactInput("2026-02-29")
      )
    ).toBe(false);
    expect(
      Schema.is(Schema.toEncoded(SourceArtifact))(
        sourceArtifactInput("2024-02-29")
      )
    ).toBe(true);
  });
});
