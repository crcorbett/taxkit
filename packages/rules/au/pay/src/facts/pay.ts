import { Context, Schema } from "effect";
import { Money } from "@whattax/core";
import { makeFactDescriptor } from "@whattax/core";
import { TraceNode } from "@whattax/core/trace";

export const PayPeriod = Schema.Literals(["weekly", "fortnightly", "monthly"]);
export type PayPeriod = typeof PayPeriod.Type;

/**
 * Conversion factor from a period's pay amount to its weekly equivalent.
 * `weeklyEquivalentCents = periodCents * payPeriodToWeeklyFactor(period)`.
 *
 * Lives next to the PayPeriod type because every withholding rule that
 * dispatches off a weekly-equivalent table needs it (PAYG, STSL, …).
 */
export const payPeriodToWeeklyFactor = (period: PayPeriod): number => {
  switch (period) {
    case "weekly":
      return 1;
    case "fortnightly":
      return 0.5;
    case "monthly":
      return 3 / 13;
  }
};

export class GrossPay extends Schema.TaggedClass<GrossPay>()("GrossPay", {
  amount: Money,
  period: PayPeriod,
}) {}

export class GrossPayFact extends Context.Service<GrossPayFact, GrossPay>()(
  "whattax/rules-au-pay/fact/GrossPay",
) {}

export const GrossPayDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-pay/fact/GrossPay",
  title: "Gross pay for a single pay period",
  authority: "input",
  schema: GrossPay,
  tag: GrossPayFact,
});

export class TaxFreeThresholdClaimed
  extends Schema.TaggedClass<TaxFreeThresholdClaimed>()(
    "TaxFreeThresholdClaimed",
    { value: Schema.Boolean },
  ) {}

export class TaxFreeThresholdClaimedFact extends Context.Service<
  TaxFreeThresholdClaimedFact,
  TaxFreeThresholdClaimed
>()("whattax/rules-au-pay/fact/TaxFreeThresholdClaimed") {}

export const TaxFreeThresholdClaimedDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-pay/fact/TaxFreeThresholdClaimed",
  title: "Whether the employee has claimed the tax-free threshold",
  authority: "input",
  schema: TaxFreeThresholdClaimed,
  tag: TaxFreeThresholdClaimedFact,
});

export class TaxablePay extends Schema.TaggedClass<TaxablePay>()("TaxablePay", {
  amount: Money,
  period: PayPeriod,
  trace: TraceNode,
}) {}

export class TaxablePayFact extends Context.Service<TaxablePayFact, TaxablePay>()(
  "whattax/rules-au-pay/fact/TaxablePay",
) {}

export const TaxablePayDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-pay/fact/TaxablePay",
  title: "Taxable pay for a single pay period",
  authority: "derived",
  schema: TaxablePay,
  tag: TaxablePayFact,
});

export class NetPay extends Schema.TaggedClass<NetPay>()("NetPay", {
  amount: Money,
  period: PayPeriod,
  trace: TraceNode,
}) {}

export class NetPayFact extends Context.Service<NetPayFact, NetPay>()(
  "whattax/rules-au-pay/fact/NetPay",
) {}

export const NetPayDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-pay/fact/NetPay",
  title: "Net (take-home) pay for a single pay period",
  authority: "derived",
  schema: NetPay,
  tag: NetPayFact,
});
