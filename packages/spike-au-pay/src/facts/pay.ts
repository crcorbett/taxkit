import { Context } from "effect";
import type { Money } from "@whattax/core";
import { makeFactDescriptor } from "@whattax/core";
import type { TraceNode } from "@whattax/core/trace";

export type PayPeriod = "weekly" | "fortnightly" | "monthly";

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

export class GrossPay {
  readonly _tag = "GrossPay";
  constructor(
    readonly fields: { readonly amount: Money; readonly period: PayPeriod },
  ) {}
  get amount(): Money {
    return this.fields.amount;
  }
  get period(): PayPeriod {
    return this.fields.period;
  }
}

export class GrossPayFact extends Context.Service<GrossPayFact, GrossPay>()(
  "whattax/spike-au-pay/fact/GrossPay",
) {}

export const GrossPayDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-pay/fact/GrossPay",
  title: "Gross pay for a single pay period",
  authority: "input",
  tag: GrossPayFact,
});

export class TaxFreeThresholdClaimed {
  readonly _tag = "TaxFreeThresholdClaimed";
  constructor(readonly fields: { readonly value: boolean }) {}
  get value(): boolean {
    return this.fields.value;
  }
}

export class TaxFreeThresholdClaimedFact extends Context.Service<
  TaxFreeThresholdClaimedFact,
  TaxFreeThresholdClaimed
>()("whattax/spike-au-pay/fact/TaxFreeThresholdClaimed") {}

export const TaxFreeThresholdClaimedDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-pay/fact/TaxFreeThresholdClaimed",
  title: "Whether the employee has claimed the tax-free threshold",
  authority: "input",
  tag: TaxFreeThresholdClaimedFact,
});

export class TaxablePay {
  readonly _tag = "TaxablePay";
  constructor(
    readonly fields: {
      readonly amount: Money;
      readonly period: PayPeriod;
      readonly trace: TraceNode;
    },
  ) {}
  get amount(): Money {
    return this.fields.amount;
  }
  get period(): PayPeriod {
    return this.fields.period;
  }
  get trace(): TraceNode {
    return this.fields.trace;
  }
}

export class TaxablePayFact extends Context.Service<TaxablePayFact, TaxablePay>()(
  "whattax/spike-au-pay/fact/TaxablePay",
) {}

export const TaxablePayDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-pay/fact/TaxablePay",
  title: "Taxable pay for a single pay period",
  authority: "derived",
  tag: TaxablePayFact,
});

export class NetPay {
  readonly _tag = "NetPay";
  constructor(
    readonly fields: {
      readonly amount: Money;
      readonly period: PayPeriod;
      readonly trace: TraceNode;
    },
  ) {}
  get amount(): Money {
    return this.fields.amount;
  }
  get period(): PayPeriod {
    return this.fields.period;
  }
  get trace(): TraceNode {
    return this.fields.trace;
  }
}

export class NetPayFact extends Context.Service<NetPayFact, NetPay>()(
  "whattax/spike-au-pay/fact/NetPay",
) {}

export const NetPayDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-pay/fact/NetPay",
  title: "Net (take-home) pay for a single pay period",
  authority: "derived",
  tag: NetPayFact,
});
