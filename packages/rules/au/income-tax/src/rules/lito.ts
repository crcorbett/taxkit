import {
  CalculationError,
  CalculationInvariantViolation,
} from "@taxkit/core/errors";
import { ComponentId, LedgerComponent } from "@taxkit/core/ledger";
import { fromCents, multiplyCentsByDecimal } from "@taxkit/core/primitives";
import { RuleId, TraceNode } from "@taxkit/core/trace";
import {
  Match,
  Function as EffectFunction,
  Array,
  BigDecimal,
  Effect,
  Layer,
  Option,
  Struct,
} from "effect";

import { LitoComponentFact } from "../facts/components.js";
import { AnnualTaxableIncomeFact } from "../facts/income.js";
import { AtoLitoTable } from "../parameters/lito-table.js";
import type { LitoBracket } from "../parameters/lito-table.js";
/**
 * Rule id for the Low Income Tax Offset.
 *
 * @since 0.1.0
 */
export const LitoRuleId = RuleId.make("taxkit/rules-au-income-tax/rule/Lito");
/**
 * Ledger component id for the Low Income Tax Offset.
 *
 * @since 0.1.0
 */
export const LitoComponentId = ComponentId.make(
  "taxkit/rules-au-income-tax/component/Lito"
);
const findBracket = (
  brackets: readonly LitoBracket[],
  incomeCents: number
): Effect.Effect<LitoBracket> => {
  const bracket = Option.orElse(
    EffectFunction.pipe(
      Array.reverse(brackets),
      Array.findFirst((b) => incomeCents > b.thresholdCents)
    ),
    () => Array.head(brackets)
  );
  // The checked table starts at zero and income is non-negative, so a missing
  // bracket means the table itself is broken.
  return Option.match(bracket, {
    onNone: () =>
      Effect.die(
        new CalculationInvariantViolation({
          invariant: "table-coverage",
          message: "No LITO bracket covers the amount.",
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
 * @throws {CalculationError} When an amount does not fit in safe whole cents.
 * @since 0.1.0
 */
export const LitoLive = Layer.effect(LitoComponentFact)(
  Effect.gen(function* () {
    const income = yield* AnnualTaxableIncomeFact;
    const table = yield* AtoLitoTable;
    const incomeCents = income.income.cents;
    const bracket = yield* findBracket(table.brackets, incomeCents);
    const taxableExcess = yield* fromCents(
      incomeCents - bracket.thresholdCents
    ).pipe(Effect.map(Struct.get("cents")));
    const phasedOut = yield* multiplyCentsByDecimal(
      taxableExcess,
      bracket.phaseOutRate
    );
    const rawOffsetCents = bracket.fullOffsetCents - phasedOut;
    const offsetCents = Math.max(0, rawOffsetCents);
    const offsetAmount = yield* fromCents(offsetCents);
    const status = Match.value(offsetCents).pipe(
      Match.when(0, (): "zeroed" => "zeroed"),
      Match.orElse((): "active" => "active")
    );
    const trace = TraceNode.make({
      children: [],
      formula: Option.some(
        "offset = max(0, fullOffset - round(phaseOutRate * (income - threshold)))"
      ),
      inputs: {
        bracketThresholdCents: bracket.thresholdCents,
        fullOffsetCents: bracket.fullOffsetCents,
        incomeCents,
        phaseOutRate: BigDecimal.format(bracket.phaseOutRate),
        tableYear: table.year,
      },
      result: offsetAmount.cents,
      rounding: Option.some("round-to-nearest-cent"),
      ruleId: LitoRuleId,
      sources: [table.source],
      title: "Low Income Tax Offset (LITO)",
    });
    const component = LedgerComponent.make({
      amount: offsetAmount,
      effect: "subtractive",
      id: LitoComponentId,
      label: "Low Income Tax Offset",
      status,
      trace,
    });
    return component;
  }).pipe(
    Effect.catchTag("MoneyError", ({ reason }) =>
      Effect.fail(
        new CalculationError({
          message: "LITO could not produce a supported amount.",
          reason,
        })
      )
    )
  )
);
