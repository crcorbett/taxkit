import { makeParameterDescriptor } from "@taxkit/core/parameters";
import {
  DateInterval,
  IsoDate,
  Cents,
  CentsOrInfinity,
  TaxRate,
  TaxYear,
  taxYear,
} from "@taxkit/core/primitives";
import {
  SourceArtifact,
  SourceExtract,
  SourceRef,
  sourceChecksum,
} from "@taxkit/core/trace";
import { Array, Option, BigDecimal, Context, Layer, Schema } from "effect";

/**
 * Marginal-rate bracket for resident individual income tax.
 *
 * `baseTaxCents` is the cumulative tax already owed at `thresholdCents`; the
 * bracket formula adds `rate * (income - thresholdCents)`.
 *
 * @since 0.1.0
 */
export class IncomeTaxBracket extends Schema.TaggedClass<IncomeTaxBracket>()(
  "IncomeTaxBracket",
  Schema.Struct({
    baseTaxCents: Cents,
    maxCents: CentsOrInfinity,
    rate: TaxRate,
    thresholdCents: Cents,
  }).check(
    Schema.makeFilter(
      ({ baseTaxCents, maxCents, rate, thresholdCents }) =>
        baseTaxCents >= 0 &&
        thresholdCents >= 0 &&
        (maxCents === "infinity" || maxCents > thresholdCents) &&
        BigDecimal.between({
          maximum: BigDecimal.make(1n, 0),
          minimum: BigDecimal.make(0n, 0),
        })(rate),
      {
        expected:
          "a non-negative income tax bracket with a rate from zero to one and an ordered upper bound",
      }
    )
  )
) {}

// Keep the same relationship check on the saved representation and decoded rows.
// Array class transformations otherwise remove this check under Schema.toEncoded.
const IncomeTaxTableCoverageCheck = Schema.makeFilter<
  readonly (typeof IncomeTaxBracket.Encoded)[]
>(
  (brackets) =>
    Array.head(brackets).pipe(
      Option.exists((row) => row.thresholdCents === 0)
    ) &&
    Array.last(brackets).pipe(
      Option.exists((row) => row.maxCents === "infinity")
    ) &&
    Array.every(
      brackets,
      (row, index) =>
        index === 0 ||
        Array.get(brackets, index - 1).pipe(
          Option.exists(
            (previous) =>
              previous.maxCents !== "infinity" &&
              previous.maxCents === row.thresholdCents
          )
        )
    ),
  {
    expected:
      "complete income tax brackets from zero without gaps or overlaps, with only the final bound open",
  }
);

const IncomeTaxTableRows = Schema.Array(Schema.toEncoded(IncomeTaxBracket))
  .check(IncomeTaxTableCoverageCheck)
  .pipe(Schema.decodeTo(Schema.Array(IncomeTaxBracket)))
  .check(IncomeTaxTableCoverageCheck);

/**
 * ATO resident individual income tax table for one tax year.
 *
 * @since 0.1.0
 */
export class IncomeTaxTable extends Schema.TaggedClass<IncomeTaxTable>()(
  "IncomeTaxTable",
  {
    brackets: IncomeTaxTableRows,
    source: SourceRef,
    year: TaxYear,
  }
) {}

/**
 * Context tag for the active ATO resident income tax table.
 *
 * @since 0.1.0
 */
export class AtoIncomeTaxTable extends Context.Service<
  AtoIncomeTaxTable,
  IncomeTaxTable
>()("taxkit/rules-au-income-tax/parameter/AtoIncomeTaxTable") {}

/**
 * Source reference for ATO resident income tax rates for 2025-26.
 *
 * @since 0.1.0
 */
export const IncomeTaxSource2025_26 = SourceRef.make({
  kind: "ato-publication",
  reference:
    "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
  title: "ATO tax rates - Australian resident 2025-26",
});

/**
 * Canonical extraction metadata for resident income-tax brackets.
 *
 * @since 0.1.0
 */
export const IncomeTaxArtifact2025_26 = new SourceArtifact({
  checksum: sourceChecksum(
    "sha256:7cc3b3d6e7823ff7a9b8f145c2809db0e5f8c8cf19d01c56dbd511f52ff33e63"
  ),
  documentVersion: "2025-26",
  extract: new SourceExtract({
    rowContract: "IncomeTaxBracket[]",
    rowCount: 5,
  }),
  retrievedOn: IsoDate.make("2026-05-12"),
  source: IncomeTaxSource2025_26,
});

/**
 * Parameter descriptor for the ATO resident income tax table.
 *
 * @since 0.1.0
 */
export const AtoIncomeTaxTableDescriptor = makeParameterDescriptor({
  effectivePeriod: DateInterval.make({
    from: IsoDate.make("2025-07-01"),
    toExclusive: Option.some(Option.some(IsoDate.make("2026-07-01"))),
  }),
  id: "taxkit/rules-au-income-tax/parameter/AtoIncomeTaxTable",
  schema: IncomeTaxTable,
  source: IncomeTaxSource2025_26,
  sourceArtifact: IncomeTaxArtifact2025_26,
  tag: AtoIncomeTaxTable,
  title: "ATO resident income tax rates",
});

// Resident individual tax rates 2025-26.
// Each bracket covers thresholdCents < income ≤ maxCents; the nil-rate band also includes exact zero.
// The nil-rate band (0 – $18,200) has threshold=0 and rate=0.
const table2025_26 = new IncomeTaxTable({
  brackets: [
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(0),
      maxCents: Cents.make(1_820_000),
      rate: TaxRate.make(BigDecimal.make(0n, 0)),
      thresholdCents: Cents.make(0),
    }),
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(0),
      maxCents: Cents.make(4_500_000),
      rate: TaxRate.make(BigDecimal.make(16n, 2)),
      thresholdCents: Cents.make(1_820_000),
    }),
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(428_800),
      maxCents: Cents.make(13_500_000),
      rate: TaxRate.make(BigDecimal.make(3n, 1)),
      thresholdCents: Cents.make(4_500_000),
    }),
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(3_128_800),
      maxCents: Cents.make(19_000_000),
      rate: TaxRate.make(BigDecimal.make(37n, 2)),
      thresholdCents: Cents.make(13_500_000),
    }),
    new IncomeTaxBracket({
      baseTaxCents: Cents.make(5_163_800),
      maxCents: "infinity",
      rate: TaxRate.make(BigDecimal.make(45n, 2)),
      thresholdCents: Cents.make(19_000_000),
    }),
  ],
  source: IncomeTaxSource2025_26,
  year: taxYear("2025-26"),
});

/**
 * Live ATO resident income tax parameter layer for 2025-26.
 *
 * @since 0.1.0
 */
export const AtoIncomeTax_2025_26_Live =
  Layer.succeed(AtoIncomeTaxTable)(table2025_26);
