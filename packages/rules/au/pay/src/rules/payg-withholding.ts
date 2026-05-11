import { CalculationError } from "@whattax/core/errors";
import { ComponentId } from "@whattax/core/ledger";
import type { LedgerComponent } from "@whattax/core/ledger";
import { audDollars } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { Array, Effect, Layer, Option } from "effect";

import {
  payPeriodToWeeklyFactor,
  TaxFreeThresholdClaimedFact,
  TaxablePayFact,
  scaleWeeklyWithholdingToPayPeriodDollars,
} from "../facts/pay.js";
import { PaygWithholdingComponentFact } from "../facts/withholdings.js";
import { AtoSchedule1Table } from "../parameters/schedule1.js";
import type {
  Schedule1Row,
  Schedule1Scale,
  Schedule1Table,
} from "../parameters/schedule1.js";

export const PaygWithholdingRuleId = RuleId.make(
  "whattax/rules-au-pay/rule/PaygWithholding"
);

export const PaygWithholdingComponentId = ComponentId.make(
  "whattax/rules-au-pay/component/Payg"
);

const findRow = (
  table: Schedule1Table,
  scale: Schedule1Scale,
  weeklyFormulaCents: number
): Effect.Effect<Schedule1Row, CalculationError> => {
  const row = Array.findFirst(
    table.rows,
    (r) =>
      r.scale === scale &&
      weeklyFormulaCents >= r.weeklyMinCents &&
      (r.weeklyMaxCents === "infinity" ||
        weeklyFormulaCents <= r.weeklyMaxCents)
  );

  return Option.match(row, {
    onNone: () =>
      Effect.fail(
        new CalculationError({
          message: `whattax/rules-au-pay: no Schedule1 ${scale} row covers weekly formula cents=${weeklyFormulaCents}`,
        })
      ),
    onSome: Effect.succeed,
  });
};

/**
 * Produces a LedgerComponent rather than a bare Money, so a downstream
 * aggregator can combine it with other withholding components (e.g. STSL)
 * without the PAYG rule needing to know about them.
 */
export const PaygWithholdingLive = Layer.effect(PaygWithholdingComponentFact)(
  Effect.gen(function* () {
    const taxable = yield* TaxablePayFact;
    const tftClaimed = yield* TaxFreeThresholdClaimedFact;
    const table = yield* AtoSchedule1Table;

    const weeklyFactor = payPeriodToWeeklyFactor(taxable.period);
    const weeklyCents = taxable.amount.cents * weeklyFactor;
    const weeklyFormulaDollars = Math.floor(weeklyCents / 100) + 0.99;
    const weeklyFormulaCents = Math.round(weeklyFormulaDollars * 100);
    const scale = tftClaimed.value ? "scale2" : "scale1";
    const row = yield* findRow(table, scale, weeklyFormulaCents);

    const weeklyWithholdingDollarsRaw =
      row.a * weeklyFormulaDollars - row.bDollars;
    const weeklyWithholdingDollarsRounded = Math.round(
      weeklyWithholdingDollarsRaw
    );
    const weeklyWithholdingDollars = Math.max(
      0,
      weeklyWithholdingDollarsRounded
    );
    const periodWithholding = audDollars(
      scaleWeeklyWithholdingToPayPeriodDollars(
        weeklyWithholdingDollars,
        taxable.period
      )
    );

    const trace = TraceNode.make({
      ruleId: PaygWithholdingRuleId,
      title: `PAYG withholding (Schedule 1, ${scale})`,
      inputs: {
        taxablePeriodCents: taxable.amount.cents,
        period: taxable.period,
        scale,
        weeklyEquivalentCents: weeklyCents,
        weeklyFormulaCents,
        a: row.a,
        bDollars: row.bDollars,
        scheduleYear: table.year,
      },
      formula:
        "weekly = round(a * (whole weekly dollars + 0.99) - b); period = scale weekly withholding to pay period",
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
  })
);
