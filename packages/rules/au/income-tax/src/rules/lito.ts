import { CalculationError } from "@whattax/core/errors";
import { ComponentId } from "@whattax/core/ledger";
import type { LedgerComponent } from "@whattax/core/ledger";
import { aud } from "@whattax/core/primitives";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { Array, Effect, Layer, Option } from "effect";

import { LitoComponentFact } from "../facts/components.js";
import { AnnualTaxableIncomeFact } from "../facts/income.js";
import { AtoLitoTable } from "../parameters/lito-table.js";
import type { LitoBracket } from "../parameters/lito-table.js";

/**
 * Rule id for the Low Income Tax Offset.
 *
 * @since 0.1.0
 */
export const LitoRuleId = RuleId.make("whattax/rules-au-income-tax/rule/Lito");

/**
 * Ledger component id for the Low Income Tax Offset.
 *
 * @since 0.1.0
 */
export const LitoComponentId = ComponentId.make(
  "whattax/rules-au-income-tax/component/Lito"
);

const findBracket = (
  brackets: readonly LitoBracket[],
  incomeCents: number
): Effect.Effect<LitoBracket, CalculationError> => {
  const bracket = Option.orElse(
    Array.findFirst(
      Array.reverse(brackets),
      (b) => incomeCents > b.thresholdCents
    ),
    () => Array.head(brackets)
  );

  return Option.match(bracket, {
    onNone: () =>
      Effect.fail(
        new CalculationError({
          message: `whattax/rules-au-income-tax: no LITO bracket covers income=${incomeCents} cents`,
        })
      ),
    onSome: Effect.succeed,
  });
};

/**
 * Current Low Income Tax Offset rule.
 *
 * Effect: `subtractive` — LITO reduces the annual tax liability.
 * Status is `zeroed` when income is above the phase-out ceiling (offset = $0),
 * `active` otherwise (including when the offset exceeds the income tax —
 * the floor to zero is the calculator's responsibility, not the ledger's).
 *
 * Formula: offset = max(0, fullOffsetCents - phaseOutRate * (income - threshold))
 *
 * @throws CalculationError when no LITO bracket is available.
 * @since 0.1.0
 */
export const LitoLive = Layer.effect(LitoComponentFact)(
  Effect.gen(function* () {
    const income = yield* AnnualTaxableIncomeFact;
    const table = yield* AtoLitoTable;

    const incomeCents = income.income.cents;
    const bracket = yield* findBracket(table.brackets, incomeCents);

    const rawOffsetCents = Math.round(
      bracket.fullOffsetCents -
        bracket.phaseOutRate * (incomeCents - bracket.thresholdCents)
    );
    const offsetCents = Math.max(0, rawOffsetCents);
    const offsetAmount = aud(offsetCents);
    const status = offsetCents === 0 ? "zeroed" : "active";

    const trace = TraceNode.make({
      children: [],
      formula:
        "offset = max(0, fullOffset - round(phaseOutRate * (income - threshold)))",
      inputs: {
        bracketThresholdCents: bracket.thresholdCents,
        fullOffsetCents: bracket.fullOffsetCents,
        incomeCents,
        phaseOutRate: bracket.phaseOutRate,
        tableYear: table.year,
      },
      result: offsetAmount,
      rounding: "round-to-nearest-cent",
      ruleId: LitoRuleId,
      sources: [table.source],
      title: "Low Income Tax Offset (LITO)",
    });

    const component: LedgerComponent = {
      _tag: "LedgerComponent",
      amount: offsetAmount,
      effect: "subtractive",
      id: LitoComponentId,
      label: "Low Income Tax Offset",
      status,
      trace,
    };
    return component;
  })
);
