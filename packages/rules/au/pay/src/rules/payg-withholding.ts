import { CalculationError } from "@taxkit/core/errors";
import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import {
  aud,
  decimalDollarsToCents,
  multiplyCentsByDecimal,
  roundCentsToDollar,
} from "@taxkit/core/primitives";
import { RuleId, TraceNode } from "@taxkit/core/trace";
import { Array, BigDecimal, Effect, Layer, Option } from "effect";

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

/**
 * Rule id for PAYG withholding using ATO Schedule 1 coefficients.
 *
 * @since 0.1.0
 */
export const PaygWithholdingRuleId = RuleId.make(
  "taxkit/rules-au-pay/rule/PaygWithholding"
);

/**
 * Ledger component id for PAYG withholding.
 *
 * @since 0.1.0
 */
export const PaygWithholdingComponentId = ComponentId.make(
  "taxkit/rules-au-pay/component/Payg"
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
          message: `taxkit/rules-au-pay: no Schedule1 ${scale} row covers weekly formula cents=${weeklyFormulaCents}`,
        })
      ),
    onSome: Effect.succeed,
  });
};

/**
 * Produces a LedgerComponent rather than a bare Money, so a downstream
 * aggregator can combine it with other withholding components (e.g. STSL)
 * without the PAYG rule needing to know about them.
 *
 * @throws CalculationError when no Schedule 1 row covers the weekly-equivalent amount.
 * @since 0.1.0
 */
export const PaygWithholdingLive = Layer.effect(PaygWithholdingComponentFact)(
  Effect.gen(function* () {
    const taxable = yield* TaxablePayFact;
    const tftClaimed = yield* TaxFreeThresholdClaimedFact;
    const table = yield* AtoSchedule1Table;

    const weeklyFactor = payPeriodToWeeklyFactor(taxable.period);
    const weeklyCents = taxable.amount.cents * weeklyFactor;
    const weeklyFormulaCents = Math.floor(weeklyCents / 100) * 100 + 99;
    const scale = tftClaimed.value ? "scale2" : "scale1";
    const row = yield* findRow(table, scale, weeklyFormulaCents);

    const weeklyWithholdingCentsRaw =
      multiplyCentsByDecimal(weeklyFormulaCents, row.a) -
      decimalDollarsToCents(row.bDollars);
    const weeklyWithholdingCentsRounded = roundCentsToDollar(
      weeklyWithholdingCentsRaw,
      "ato-withholding-rounding"
    );
    const weeklyWithholdingDollars =
      Math.max(0, weeklyWithholdingCentsRounded) / 100;
    const periodWithholding = aud(
      scaleWeeklyWithholdingToPayPeriodDollars(
        weeklyWithholdingDollars,
        taxable.period
      ) * 100
    );

    const trace = TraceNode.make({
      children: [taxable.trace],
      formula:
        "weekly = round(a * (whole weekly dollars + 0.99) - b); period = scale weekly withholding to pay period",
      inputs: {
        a: BigDecimal.format(row.a),
        bDollars: BigDecimal.format(row.bDollars),
        period: taxable.period,
        scale,
        scheduleYear: table.year,
        taxablePeriodCents: taxable.amount.cents,
        weeklyEquivalentCents: weeklyCents,
        weeklyFormulaCents,
        weeklyWithholdingCentsRaw,
      },
      result: periodWithholding.cents,
      rounding: "ato-withholding-rounding",
      ruleId: PaygWithholdingRuleId,
      sources: [table.source],
      title: `PAYG withholding (Schedule 1, ${scale})`,
    });

    const component = LedgerComponent.make({
      amount: periodWithholding,
      effect: "additive",
      id: PaygWithholdingComponentId,
      label: "PAYG withholding",
      status: "active",
      trace,
    });

    return component;
  })
);
