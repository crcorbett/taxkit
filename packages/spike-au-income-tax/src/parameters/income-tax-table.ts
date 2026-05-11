import { Context, Layer } from "effect";
import { SourceRef } from "@whattax/core/trace";

/**
 * Marginal-rate income tax bracket.
 *
 * Formula: tax = baseTaxCents + rate * (incomeCents - thresholdCents)
 *
 * `thresholdCents` is the ATO's "each $1 over X" boundary in cents
 * (e.g. $18,200 → 1_820_000). `baseTaxCents` is the cumulative tax
 * already owed at the threshold — zero for the first two brackets.
 */
export class IncomeTaxBracket {
  readonly _tag = "IncomeTaxBracket";
  constructor(
    readonly fields: {
      readonly thresholdCents: number;
      readonly maxCents: number | "infinity";
      readonly rate: number;
      readonly baseTaxCents: number;
    },
  ) {}
  get thresholdCents(): number { return this.fields.thresholdCents; }
  get maxCents(): number | "infinity" { return this.fields.maxCents; }
  get rate(): number { return this.fields.rate; }
  get baseTaxCents(): number { return this.fields.baseTaxCents; }
}

export class IncomeTaxTable {
  readonly _tag = "IncomeTaxTable";
  constructor(
    readonly fields: {
      readonly year: string;
      readonly brackets: ReadonlyArray<IncomeTaxBracket>;
      readonly source: SourceRef;
    },
  ) {}
  get year(): string { return this.fields.year; }
  get brackets(): ReadonlyArray<IncomeTaxBracket> { return this.fields.brackets; }
  get source(): SourceRef { return this.fields.source; }
}

export class AtoIncomeTaxTable extends Context.Service<
  AtoIncomeTaxTable,
  IncomeTaxTable
>()("whattax/spike-au-income-tax/parameter/AtoIncomeTaxTable") {}

const spikeSource2025_26 = SourceRef.make({
  kind: "internal-spike",
  title: "Illustrative AU income tax brackets for 2025-26 spike",
  reference: "spike-fixture/income-tax/2025-26",
});

// Resident individual tax rates 2025-26.
// Each bracket covers: thresholdCents < income ≤ maxCents.
// The nil-rate band (0 – $18,200) has threshold=0 and rate=0.
const table2025_26 = new IncomeTaxTable({
  year: "2025-26",
  brackets: [
    new IncomeTaxBracket({ thresholdCents: 0,          maxCents: 1_820_000,  rate: 0,     baseTaxCents: 0 }),
    new IncomeTaxBracket({ thresholdCents: 1_820_000,  maxCents: 4_500_000,  rate: 0.19,  baseTaxCents: 0 }),
    new IncomeTaxBracket({ thresholdCents: 4_500_000,  maxCents: 12_000_000, rate: 0.325, baseTaxCents: 509_200 }),
    new IncomeTaxBracket({ thresholdCents: 12_000_000, maxCents: 18_000_000, rate: 0.37,  baseTaxCents: 2_946_700 }),
    new IncomeTaxBracket({ thresholdCents: 18_000_000, maxCents: "infinity", rate: 0.45,  baseTaxCents: 5_166_700 }),
  ],
  source: spikeSource2025_26,
});

export const AtoIncomeTax_2025_26_Live = Layer.succeed(AtoIncomeTaxTable)(table2025_26);
