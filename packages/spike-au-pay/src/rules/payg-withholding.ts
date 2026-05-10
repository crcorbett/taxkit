import { Effect, Layer } from "effect";
import { ComponentId, type LedgerComponent } from "@whattax/core/ledger";
import { audDollars } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import {
  payPeriodToWeeklyFactor,
  TaxFreeThresholdClaimedFact,
  TaxablePayFact,
} from "../facts/pay.js";
import { PaygWithholdingComponentFact } from "../facts/withholdings.js";
import {
  AtoSchedule1Table,
  type Schedule1Row,
  type Schedule1Table,
} from "../parameters/schedule1.js";

export const PaygWithholdingRuleId = RuleId.make(
  "whattax/spike-au-pay/rule/PaygWithholding",
);

export const PaygWithholdingComponentId = ComponentId.make(
  "whattax/spike-au-pay/component/Payg",
);

const findRow = (table: Schedule1Table, weeklyCents: number): Schedule1Row => {
  const row = table.rows.find((r) => {
    if (weeklyCents < r.weeklyMinCents) return false;
    if (r.weeklyMaxCents === "infinity") return true;
    return weeklyCents <= r.weeklyMaxCents;
  });
  if (!row) {
    throw new Error(
      `whattax/spike-au-pay: no Schedule1 row covers weekly cents=${weeklyCents}`,
    );
  }
  return row;
};

/**
 * Spike scope: only Scale 2 (resident, tax-free threshold claimed).
 *
 * Produces a LedgerComponent rather than a bare Money, so a downstream
 * aggregator can combine it with other withholding components (e.g. STSL)
 * without the PAYG rule needing to know about them.
 */
export const PaygWithholdingLive = Layer.effect(PaygWithholdingComponentFact)(
  Effect.gen(function* () {
    const taxable = yield* TaxablePayFact;
    const tftClaimed = yield* TaxFreeThresholdClaimedFact;
    const table = yield* AtoSchedule1Table;

    if (!tftClaimed.value) {
      return yield* Effect.die(
        new Error(
          "whattax/spike-au-pay: Scale 1 (no tax-free threshold) not implemented in spike",
        ),
      );
    }

    const weeklyFactor = payPeriodToWeeklyFactor(taxable.period);
    const weeklyCents = taxable.amount.cents * weeklyFactor;
    const weeklyDollars = weeklyCents / 100;
    const row = findRow(table, weeklyCents);

    const weeklyWithholdingDollarsRaw = row.a * weeklyDollars - row.bDollars;
    const weeklyWithholdingDollarsRounded = Math.round(
      weeklyWithholdingDollarsRaw,
    );
    const weeklyWithholdingDollars = Math.max(0, weeklyWithholdingDollarsRounded);
    const periodWithholding = audDollars(
      weeklyWithholdingDollars / weeklyFactor,
    );

    const trace = TraceNode.make({
      ruleId: PaygWithholdingRuleId,
      title: "PAYG withholding (Schedule 1, Scale 2)",
      inputs: {
        taxablePeriodCents: taxable.amount.cents,
        period: taxable.period,
        weeklyEquivalentCents: weeklyCents,
        a: row.a,
        bDollars: row.bDollars,
        scheduleYear: table.year,
      },
      formula: "withholding = round(a * weeklyEarnings - b) / weeklyFactor",
      result: periodWithholding,
      rounding: "ato-withholding-rounding",
      sources: [table.source],
      children: [taxable.trace],
    });

    const component: LedgerComponent = {
      _tag: "LedgerComponent",
      id: PaygWithholdingComponentId,
      label: "PAYG withholding",
      amount: periodWithholding,
      effect: "additive",
      status: "active",
      trace,
    };

    return component;
  }),
);
