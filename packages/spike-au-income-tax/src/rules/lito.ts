import { Effect, Layer } from "effect";
import { ComponentId, type LedgerComponent } from "@whattax/core/ledger";
import { aud } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { AnnualTaxableIncomeFact } from "../facts/income.js";
import { LitoComponentFact } from "../facts/components.js";
import { AtoLitoTable, type LitoBracket } from "../parameters/lito-table.js";

export const LitoRuleId = RuleId.make(
  "whattax/spike-au-income-tax/rule/Lito",
);

export const LitoComponentId = ComponentId.make(
  "whattax/spike-au-income-tax/component/Lito",
);

const findBracket = (
  brackets: ReadonlyArray<LitoBracket>,
  incomeCents: number,
): LitoBracket => {
  // Iterate highest-threshold-first; first match wins.
  // Uses > (not >=) so $37,500 stays in the flat bracket, not the phase-out bracket.
  for (let i = brackets.length - 1; i >= 0; i--) {
    const b = brackets[i]!;
    if (incomeCents > b.thresholdCents) return b;
  }
  // Income of $0 falls through; return the first bracket (flat full offset).
  return brackets[0]!;
};

/**
 * Spike Low Income Tax Offset rule.
 *
 * Effect: `subtractive` — LITO reduces the annual tax liability.
 * Status is `zeroed` when income is above the phase-out ceiling (offset = $0),
 * `active` otherwise (including when the offset exceeds the income tax —
 * the floor to zero is the calculator's responsibility, not the ledger's).
 *
 * Formula: offset = max(0, fullOffsetCents - phaseOutRate * (income - threshold))
 */
export const LitoLive = Layer.effect(LitoComponentFact)(
  Effect.gen(function* () {
    const income = yield* AnnualTaxableIncomeFact;
    const table = yield* AtoLitoTable;

    const incomeCents = income.income.cents;
    const bracket = findBracket(table.brackets, incomeCents);

    const rawOffsetCents = Math.round(
      bracket.fullOffsetCents -
        bracket.phaseOutRate * (incomeCents - bracket.thresholdCents),
    );
    const offsetCents = Math.max(0, rawOffsetCents);
    const offsetAmount = aud(offsetCents);
    const status = offsetCents === 0 ? "zeroed" : "active";

    const trace = TraceNode.make({
      ruleId: LitoRuleId,
      title: "Low Income Tax Offset (LITO)",
      inputs: {
        incomeCents,
        bracketThresholdCents: bracket.thresholdCents,
        fullOffsetCents: bracket.fullOffsetCents,
        phaseOutRate: bracket.phaseOutRate,
        tableYear: table.year,
      },
      formula: "offset = max(0, fullOffset - round(phaseOutRate * (income - threshold)))",
      result: offsetAmount,
      rounding: "round-to-nearest-cent",
      sources: [table.source],
      children: [],
    });

    const component: LedgerComponent = {
      _tag: "LedgerComponent",
      id: LitoComponentId,
      label: "Low Income Tax Offset",
      amount: offsetAmount,
      effect: "subtractive",
      status,
      trace,
    };
    return component;
  }),
);
