import { Context, Layer } from "effect";
import { SourceRef } from "@whattax/core/trace";

/**
 * ATO Schedule 1 coefficient row, scale 2 (resident, tax-free threshold claimed).
 *
 * The ATO weekly formula is `withholding = a * weekly - b` applied to the
 * weekly-equivalent earnings, then rounded to the nearest dollar and converted
 * back to the period.
 *
 * Parameter tables are constructed in code, not decoded from JSON in the
 * spike, so they're plain classes rather than TaggedClass.
 */
export class Schedule1Row {
  readonly _tag = "Schedule1Row";
  constructor(
    readonly fields: {
      readonly weeklyMinCents: number;
      readonly weeklyMaxCents: number | "infinity";
      readonly a: number;
      readonly bDollars: number;
    },
  ) {}
  get weeklyMinCents(): number {
    return this.fields.weeklyMinCents;
  }
  get weeklyMaxCents(): number | "infinity" {
    return this.fields.weeklyMaxCents;
  }
  get a(): number {
    return this.fields.a;
  }
  get bDollars(): number {
    return this.fields.bDollars;
  }
}

export class Schedule1Table {
  readonly _tag = "Schedule1Table";
  constructor(
    readonly fields: {
      readonly year: string;
      readonly rows: ReadonlyArray<Schedule1Row>;
      readonly source: SourceRef;
    },
  ) {}
  get year(): string {
    return this.fields.year;
  }
  get rows(): ReadonlyArray<Schedule1Row> {
    return this.fields.rows;
  }
  get source(): SourceRef {
    return this.fields.source;
  }
}

export class AtoSchedule1Table extends Context.Service<
  AtoSchedule1Table,
  Schedule1Table
>()("whattax/spike-au-pay/parameter/AtoSchedule1Table") {}

const spikeSource2025_26 = SourceRef.make({
  kind: "internal-spike",
  title: "Illustrative AU Schedule 1 (Scale 2) for 2025-26 spike",
  reference: "spike-fixture/2025-26",
});

const spikeSource2024_25 = SourceRef.make({
  kind: "internal-spike",
  title: "Illustrative AU Schedule 1 (Scale 2) for 2024-25 spike",
  reference: "spike-fixture/2024-25",
});

const table2025_26 = new Schedule1Table({
  year: "2025-26",
  rows: [
    new Schedule1Row({
      weeklyMinCents: 0,
      weeklyMaxCents: 36_000,
      a: 0,
      bDollars: 0,
    }),
    new Schedule1Row({
      weeklyMinCents: 36_001,
      weeklyMaxCents: 86_500,
      a: 0.19,
      bDollars: 68.3462,
    }),
    new Schedule1Row({
      weeklyMinCents: 86_501,
      weeklyMaxCents: "infinity",
      a: 0.32,
      bDollars: 180.0385,
    }),
  ],
  source: spikeSource2025_26,
});

const table2024_25 = new Schedule1Table({
  year: "2024-25",
  rows: [
    new Schedule1Row({
      weeklyMinCents: 0,
      weeklyMaxCents: 36_000,
      a: 0,
      bDollars: 0,
    }),
    new Schedule1Row({
      weeklyMinCents: 36_001,
      weeklyMaxCents: "infinity",
      a: 0.18,
      bDollars: 64,
    }),
  ],
  source: spikeSource2024_25,
});

export const AtoSchedule1_2025_26_Live = Layer.succeed(AtoSchedule1Table)(
  table2025_26,
);

export const AtoSchedule1_2024_25_Live = Layer.succeed(AtoSchedule1Table)(
  table2024_25,
);
