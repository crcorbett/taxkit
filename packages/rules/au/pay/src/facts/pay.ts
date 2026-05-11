import {
  FactQuestion,
  FactQuestionId,
  Money,
  makeFactDescriptor,
} from "@whattax/core";
import { TraceNode } from "@whattax/core/trace";
import { Context, Match, Schema } from "effect";

/**
 * Pay periods supported by the Australian withholding rule packages.
 *
 * @since 0.1.0
 */
export const PayPeriod = Schema.Literals(["weekly", "fortnightly", "monthly"]);

/**
 * Pay-period literal type.
 *
 * @since 0.1.0
 */
export type PayPeriod = typeof PayPeriod.Type;

/**
 * Converts a pay-period amount to its weekly equivalent for ATO formula
 * lookup.
 *
 * @param period - Pay period used by the gross or taxable pay fact.
 * @returns The multiplier applied to period cents to get weekly-equivalent cents.
 * @since 0.1.0
 *
 * @example
 * ```ts
 * import { payPeriodToWeeklyFactor } from "@whattax/rules-au-pay/facts"
 *
 * const weeklyCents = 400_000 * payPeriodToWeeklyFactor("fortnightly")
 * ```
 */
export const payPeriodToWeeklyFactor = (period: PayPeriod): number =>
  Match.value(period).pipe(
    Match.when("weekly", () => 1),
    Match.when("fortnightly", () => 0.5),
    Match.when("monthly", () => 3 / 13),
    Match.exhaustive
  );

/**
 * Scales a rounded weekly withholding amount back to the original pay period.
 *
 * @param weeklyWithholdingDollars - Whole-dollar weekly withholding amount.
 * @param period - Target pay period for the final withholding amount.
 * @returns Whole-dollar withholding amount for the target period.
 * @since 0.1.0
 */
export const scaleWeeklyWithholdingToPayPeriodDollars = (
  weeklyWithholdingDollars: number,
  period: PayPeriod
): number =>
  Match.value(period).pipe(
    Match.when("weekly", () => weeklyWithholdingDollars),
    Match.when("fortnightly", () => weeklyWithholdingDollars * 2),
    Match.when("monthly", () =>
      Math.round((weeklyWithholdingDollars * 13) / 3)
    ),
    Match.exhaustive
  );

/**
 * Gross pay received for one pay period before withholdings or pre-tax
 * deductions.
 *
 * @since 0.1.0
 *
 * @example
 * ```ts
 * import { audDollars } from "@whattax/core/primitives"
 * import { GrossPay } from "@whattax/rules-au-pay/facts"
 *
 * const gross = new GrossPay({ amount: audDollars(2_000), period: "fortnightly" })
 * ```
 */
export class GrossPay extends Schema.TaggedClass<GrossPay>()("GrossPay", {
  amount: Money,
  period: PayPeriod,
}) {}

/**
 * Context tag for caller-provided gross pay.
 *
 * @since 0.1.0
 */
export class GrossPayFact extends Context.Service<GrossPayFact, GrossPay>()(
  "whattax/rules-au-pay/fact/GrossPay"
) {}

/**
 * Fact descriptor for gross pay, including its money-input question metadata.
 *
 * @since 0.1.0
 */
export const GrossPayDescriptor = makeFactDescriptor({
  authority: "input",
  id: "whattax/rules-au-pay/fact/GrossPay",
  question: new FactQuestion({
    id: FactQuestionId.make("whattax/rules-au-pay/question/GrossPay"),
    inputKind: "money",
    prompt: "Gross pay for the pay period",
  }),
  schema: GrossPay,
  tag: GrossPayFact,
  title: "Gross pay for a single pay period",
});

/**
 * Whether the employee has claimed the tax-free threshold.
 *
 * PAYG Schedule 1 uses this fact to select resident Scale 2 when `true`, or
 * resident Scale 1 when `false`.
 *
 * @since 0.1.0
 */
export class TaxFreeThresholdClaimed extends Schema.TaggedClass<TaxFreeThresholdClaimed>()(
  "TaxFreeThresholdClaimed",
  { value: Schema.Boolean }
) {}

/**
 * Context tag for tax-free-threshold claim status.
 *
 * @since 0.1.0
 */
export class TaxFreeThresholdClaimedFact extends Context.Service<
  TaxFreeThresholdClaimedFact,
  TaxFreeThresholdClaimed
>()("whattax/rules-au-pay/fact/TaxFreeThresholdClaimed") {}

/**
 * Fact descriptor for tax-free-threshold claim status.
 *
 * @since 0.1.0
 */
export const TaxFreeThresholdClaimedDescriptor = makeFactDescriptor({
  authority: "input",
  id: "whattax/rules-au-pay/fact/TaxFreeThresholdClaimed",
  question: new FactQuestion({
    id: FactQuestionId.make(
      "whattax/rules-au-pay/question/TaxFreeThresholdClaimed"
    ),
    inputKind: "boolean",
    prompt: "Tax-free threshold claimed",
  }),
  schema: TaxFreeThresholdClaimed,
  tag: TaxFreeThresholdClaimedFact,
  title: "Whether the employee has claimed the tax-free threshold",
});

/**
 * Pay amount used by withholding rules after pre-tax adjustments.
 *
 * @since 0.1.0
 */
export class TaxablePay extends Schema.TaggedClass<TaxablePay>()("TaxablePay", {
  amount: Money,
  period: PayPeriod,
  trace: TraceNode,
}) {}

/**
 * Context tag for derived taxable pay.
 *
 * @since 0.1.0
 */
export class TaxablePayFact extends Context.Service<
  TaxablePayFact,
  TaxablePay
>()("whattax/rules-au-pay/fact/TaxablePay") {}

/**
 * Fact descriptor for taxable pay.
 *
 * @since 0.1.0
 */
export const TaxablePayDescriptor = makeFactDescriptor({
  authority: "derived",
  id: "whattax/rules-au-pay/fact/TaxablePay",
  schema: TaxablePay,
  tag: TaxablePayFact,
  title: "Taxable pay for a single pay period",
});

/**
 * Final take-home pay for one pay period after active withholding components.
 *
 * @since 0.1.0
 */
export class NetPay extends Schema.TaggedClass<NetPay>()("NetPay", {
  amount: Money,
  period: PayPeriod,
  trace: TraceNode,
}) {}

/**
 * Context tag for derived net pay.
 *
 * @since 0.1.0
 */
export class NetPayFact extends Context.Service<NetPayFact, NetPay>()(
  "whattax/rules-au-pay/fact/NetPay"
) {}

/**
 * Fact descriptor for net pay.
 *
 * @since 0.1.0
 */
export const NetPayDescriptor = makeFactDescriptor({
  authority: "derived",
  id: "whattax/rules-au-pay/fact/NetPay",
  schema: NetPay,
  tag: NetPayFact,
  title: "Net (take-home) pay for a single pay period",
});
