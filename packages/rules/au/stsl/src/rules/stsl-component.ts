import { Array, Effect, Layer, Option } from "effect";
import { ComponentId, type LedgerComponent } from "@whattax/core/ledger";
import { aud, audDollars } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import {
  payPeriodToWeeklyFactor,
  scaleWeeklyWithholdingToPayPeriodDollars,
  TaxablePayFact,
} from "@whattax/rules-au-pay/facts";
import { CalculationError } from "@whattax/core/errors";
import { StslComponentFact, StslDebtFact } from "../facts/stsl.js";
import {
  AtoStslTable,
  type StslRow,
  type StslTable,
} from "../parameters/stsl-table.js";

export const StslComponentRuleId = RuleId.make(
  "whattax/rules-au-stsl/rule/StslComponent",
);

export const StslComponentId = ComponentId.make(
  "whattax/rules-au-stsl/component/Stsl",
);

const findRow = (
  table: StslTable,
  weeklyFormulaCents: number,
): Effect.Effect<StslRow, CalculationError> => {
  const row = Array.findFirst(
    table.rows,
    (r) =>
      weeklyFormulaCents >= r.weeklyMinCents &&
      (r.weeklyMaxCents === "infinity" ||
        weeklyFormulaCents <= r.weeklyMaxCents),
  );

  return Option.match(row, {
    onNone: () =>
      Effect.fail(
        new CalculationError({
          message: `whattax/rules-au-stsl: no STSL row covers weekly formula cents=${weeklyFormulaCents}`,
        }),
      ),
    onSome: Effect.succeed,
  });
};

/**
 * Current STSL component using ATO Schedule 8 marginal component rows.
 */
export const StslComponentLive = Layer.effect(StslComponentFact)(
  Effect.gen(function* () {
    const taxable = yield* TaxablePayFact;
    const stslDebt = yield* StslDebtFact;
    const table = yield* AtoStslTable;

    const baseTraceInputs = {
      taxablePeriodCents: taxable.amount.cents,
      period: taxable.period,
      enabled: stslDebt.enabled,
      tableYear: table.year,
    } as const;

    if (!stslDebt.enabled) {
      const trace = TraceNode.make({
        ruleId: StslComponentRuleId,
        title: "STSL withholding (opt-out - component disabled)",
        inputs: baseTraceInputs,
        formula: "stsl = 0 (opted out)",
        result: aud(0),
        sources: [table.source],
        children: [taxable.trace],
      });
      const component: LedgerComponent = {
        _tag: "LedgerComponent",
        id: StslComponentId,
        label: "STSL withholding",
        amount: aud(0),
        effect: "additive",
        status: "disabled",
        trace,
      };
      return component;
    }

    const weeklyFactor = payPeriodToWeeklyFactor(taxable.period);
    const weeklyCents = taxable.amount.cents * weeklyFactor;
    const weeklyFormulaDollars = Math.floor(weeklyCents / 100) + 0.99;
    const weeklyFormulaCents = Math.round(weeklyFormulaDollars * 100);
    const row = yield* findRow(table, weeklyFormulaCents);
    const weeklyWithholdingDollarsRaw =
      row.a * weeklyFormulaDollars - row.bDollars;
    const weeklyWithholdingDollars = Math.max(
      0,
      Math.round(weeklyWithholdingDollarsRaw),
    );

    if (weeklyWithholdingDollars === 0) {
      const trace = TraceNode.make({
        ruleId: StslComponentRuleId,
        title: "STSL withholding (zero component)",
        inputs: {
          ...baseTraceInputs,
          weeklyEquivalentCents: weeklyCents,
          weeklyFormulaCents,
          a: row.a,
          bDollars: row.bDollars,
        },
        formula: "stsl = 0 (Schedule 8 component rounds to zero)",
        result: aud(0),
        rounding: "ato-withholding-rounding",
        sources: [table.source],
        children: [taxable.trace],
      });
      const component: LedgerComponent = {
        _tag: "LedgerComponent",
        id: StslComponentId,
        label: "STSL withholding",
        amount: aud(0),
        effect: "additive",
        status: "zeroed",
        trace,
      };
      return component;
    }

    const periodWithholding = audDollars(
      scaleWeeklyWithholdingToPayPeriodDollars(
        weeklyWithholdingDollars,
        taxable.period,
      ),
    );

    const trace = TraceNode.make({
      ruleId: StslComponentRuleId,
      title: "STSL withholding (Schedule 8)",
      inputs: {
        ...baseTraceInputs,
        weeklyEquivalentCents: weeklyCents,
        weeklyFormulaCents,
        a: row.a,
        bDollars: row.bDollars,
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
      id: StslComponentId,
      label: "STSL withholding",
      amount: periodWithholding,
      effect: "additive",
      status: "active",
      trace,
    };
    return component;
  }),
);
