import { Effect, Layer } from "effect";
import { CalculationError } from "@whattax/core/errors";
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
  "whattax/rules-au-pay/rule/PaygWithholding",
);

export const PaygWithholdingComponentId = ComponentId.make(
  "whattax/rules-au-pay/component/Payg",
);

const findRow = (
  table: Schedule1Table,
  weeklyFormulaCents: number,
): Effect.Effect<Schedule1Row, CalculationError> => {
  const row = table.rows.find((r) => {
    if (weeklyFormulaCents < r.weeklyMinCents) return false;
    if (r.weeklyMaxCents === "infinity") return true;
    return weeklyFormulaCents <= r.weeklyMaxCents;
  });
  return row
    ? Effect.succeed(row)
    : Effect.fail(
        new CalculationError({
          message: `whattax/rules-au-pay: no Schedule1 row covers weekly formula cents=${weeklyFormulaCents}`,
        }),
      );
};

/**
 * Current scope: only Scale 2 (resident, tax-free threshold claimed).
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
      return yield* Effect.fail(
        new CalculationError({
          message:
            "whattax/rules-au-pay: Scale 1 (no tax-free threshold) is not implemented",
        }),
      );
    }

    const weeklyFactor = payPeriodToWeeklyFactor(taxable.period);
    const weeklyCents = taxable.amount.cents * weeklyFactor;
    const weeklyFormulaDollars = Math.floor(weeklyCents / 100) + 0.99;
    const weeklyFormulaCents = Math.round(weeklyFormulaDollars * 100);
    const row = yield* findRow(table, weeklyFormulaCents);

    const weeklyWithholdingDollarsRaw = row.a * weeklyFormulaDollars - row.bDollars;
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
        weeklyFormulaCents,
        a: row.a,
        bDollars: row.bDollars,
        scheduleYear: table.year,
      },
      formula:
        "withholding = round(a * (whole weekly dollars + 0.99) - b) / weeklyFactor",
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
