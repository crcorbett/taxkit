import { Context } from "effect";
import type { Money } from "@whattax/core";
import { makeFactDescriptor } from "@whattax/core";
import type { TraceNode } from "@whattax/core/trace";

export type PayPeriod = "weekly" | "fortnightly" | "monthly";

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

export class PaygWithholding {
  readonly _tag = "PaygWithholding";
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

export class PaygWithholdingFact extends Context.Service<
  PaygWithholdingFact,
  PaygWithholding
>()("whattax/spike-au-pay/fact/PaygWithholding") {}

export const PaygWithholdingDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-pay/fact/PaygWithholding",
  title: "PAYG amount withheld for a single pay period",
  authority: "derived",
  tag: PaygWithholdingFact,
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
