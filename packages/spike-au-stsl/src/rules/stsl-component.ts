import { Effect, Layer } from "effect";
import { ComponentId, type LedgerComponent } from "@whattax/core/ledger";
import { aud, audDollars } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import {
  payPeriodToWeeklyFactor,
  TaxablePayFact,
} from "@whattax/spike-au-pay/facts";
import { StslComponentFact, StslDebtFact } from "../facts/stsl.js";
import { AtoStslTable } from "../parameters/stsl-table.js";

export const StslComponentRuleId = RuleId.make(
  "whattax/spike-au-stsl/rule/StslComponent",
);

export const StslComponentId = ComponentId.make(
  "whattax/spike-au-stsl/component/Stsl",
);

/**
 * Spike STSL component: simplified single-bracket withholding.
 *
 * Status mapping demonstrates all three statuses on the same rule:
 * - StslDebt.enabled = false   → status `disabled` (component shown in trace, $0)
 * - enabled, weekly < threshold → status `zeroed`   (rule says zero, $0)
 * - enabled, weekly ≥ threshold → status `active`   (rule contributes)
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
      weeklyThresholdCents: table.weeklyThresholdCents,
      rate: table.rate,
      tableYear: table.year,
    } as const;

    if (!stslDebt.enabled) {
      const trace = TraceNode.make({
        ruleId: StslComponentRuleId,
        title: "STSL withholding (opt-out — component disabled)",
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

    if (weeklyCents < table.weeklyThresholdCents) {
      const trace = TraceNode.make({
        ruleId: StslComponentRuleId,
        title: "STSL withholding (below repayment threshold)",
        inputs: { ...baseTraceInputs, weeklyEquivalentCents: weeklyCents },
        formula: "stsl = 0 (weekly equivalent below threshold)",
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

    const weeklyDollars = weeklyCents / 100;
    const weeklyWithholdingDollars = Math.round(table.rate * weeklyDollars);
    const periodWithholding = audDollars(weeklyWithholdingDollars / weeklyFactor);

    const trace = TraceNode.make({
      ruleId: StslComponentRuleId,
      title: "STSL withholding (single-bracket spike)",
      inputs: { ...baseTraceInputs, weeklyEquivalentCents: weeklyCents },
      formula: "stsl = round(rate * weeklyEarnings) / weeklyFactor",
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
