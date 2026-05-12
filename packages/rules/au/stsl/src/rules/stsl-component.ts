import { CalculationError } from "@whattax/core/errors";
import { ComponentId } from "@whattax/core/ledger";
import type { LedgerComponent } from "@whattax/core/ledger";
import {
  aud,
  decimalDollarsToCents,
  multiplyCentsByDecimal,
  roundCentsToDollar,
} from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import {
  payPeriodToWeeklyFactor,
  TaxablePayFact,
  scaleWeeklyWithholdingToPayPeriodDollars,
} from "@whattax/rules-au-pay/facts";
import { Array, Effect, Layer, Option } from "effect";

import { StslComponentFact, StslDebtFact } from "../facts/stsl.js";
import { AtoStslTable } from "../parameters/stsl-table.js";
import type { StslRow, StslTable } from "../parameters/stsl-table.js";

/**
 * Rule id for the STSL withholding component.
 *
 * @since 0.1.0
 */
export const StslComponentRuleId = RuleId.make(
  "whattax/rules-au-stsl/rule/StslComponent"
);

/**
 * Ledger component id for STSL withholding.
 *
 * @since 0.1.0
 */
export const StslComponentId = ComponentId.make(
  "whattax/rules-au-stsl/component/Stsl"
);

const findRow = (
  table: StslTable,
  weeklyFormulaCents: number
): Effect.Effect<StslRow, CalculationError> => {
  const row = Array.findFirst(
    table.rows,
    (r) =>
      weeklyFormulaCents >= r.weeklyMinCents &&
      (r.weeklyMaxCents === "infinity" ||
        weeklyFormulaCents <= r.weeklyMaxCents)
  );

  return Option.match(row, {
    onNone: () =>
      Effect.fail(
        new CalculationError({
          message: `whattax/rules-au-stsl: no STSL row covers weekly formula cents=${weeklyFormulaCents}`,
        })
      ),
    onSome: Effect.succeed,
  });
};

/**
 * Current STSL component using ATO Schedule 8 marginal component rows.
 *
 * @throws CalculationError when no Schedule 8 row covers the weekly-equivalent amount.
 * @since 0.1.0
 */
export const StslComponentLive = Layer.effect(StslComponentFact)(
  Effect.gen(function* () {
    const taxable = yield* TaxablePayFact;
    const stslDebt = yield* StslDebtFact;
    const table = yield* AtoStslTable;

    const baseTraceInputs = {
      enabled: stslDebt.enabled,
      period: taxable.period,
      tableYear: table.year,
      taxablePeriodCents: taxable.amount.cents,
    } as const;

    if (!stslDebt.enabled) {
      const trace = TraceNode.make({
        children: [taxable.trace],
        formula: "stsl = 0 (opted out)",
        inputs: baseTraceInputs,
        result: aud(0),
        ruleId: StslComponentRuleId,
        sources: [table.source],
        title: "STSL withholding (opt-out - component disabled)",
      });
      const component: LedgerComponent = {
        _tag: "LedgerComponent",
        amount: aud(0),
        effect: "additive",
        id: StslComponentId,
        label: "STSL withholding",
        status: "disabled",
        trace,
      };
      return component;
    }

    const weeklyFactor = payPeriodToWeeklyFactor(taxable.period);
    const weeklyCents = taxable.amount.cents * weeklyFactor;
    const weeklyFormulaCents = Math.floor(weeklyCents / 100) * 100 + 99;
    const row = yield* findRow(table, weeklyFormulaCents);
    const weeklyWithholdingCentsRaw =
      multiplyCentsByDecimal(weeklyFormulaCents, row.a) -
      decimalDollarsToCents(row.bDollars);
    const weeklyWithholdingCentsRounded = roundCentsToDollar(
      weeklyWithholdingCentsRaw,
      "ato-withholding-rounding"
    );
    const weeklyWithholdingDollars =
      Math.max(0, weeklyWithholdingCentsRounded) / 100;

    if (weeklyWithholdingDollars === 0) {
      const trace = TraceNode.make({
        children: [taxable.trace],
        formula: "stsl = 0 (Schedule 8 component rounds to zero)",
        inputs: {
          ...baseTraceInputs,
          a: row.a,
          bDollars: row.bDollars,
          weeklyEquivalentCents: weeklyCents,
          weeklyFormulaCents,
        },
        result: aud(0),
        rounding: "ato-withholding-rounding",
        ruleId: StslComponentRuleId,
        sources: [table.source],
        title: "STSL withholding (zero component)",
      });
      const component: LedgerComponent = {
        _tag: "LedgerComponent",
        amount: aud(0),
        effect: "additive",
        id: StslComponentId,
        label: "STSL withholding",
        status: "zeroed",
        trace,
      };
      return component;
    }

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
        ...baseTraceInputs,
        a: row.a,
        bDollars: row.bDollars,
        weeklyEquivalentCents: weeklyCents,
        weeklyFormulaCents,
        weeklyWithholdingCentsRaw,
      },
      result: periodWithholding,
      rounding: "ato-withholding-rounding",
      ruleId: StslComponentRuleId,
      sources: [table.source],
      title: "STSL withholding (Schedule 8)",
    });

    const component: LedgerComponent = {
      _tag: "LedgerComponent",
      amount: periodWithholding,
      effect: "additive",
      id: StslComponentId,
      label: "STSL withholding",
      status: "active",
      trace,
    };
    return component;
  })
);
