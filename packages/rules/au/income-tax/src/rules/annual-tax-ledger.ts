import { sumLedgerComponents } from "@whattax/core/ledger";
import { RuleId, TraceNode } from "@whattax/core/trace";
import { Effect, Layer } from "effect";

import {
  IncomeTaxComponentFact,
  LitoComponentFact,
  MedicareLevyComponentFact,
} from "../facts/components.js";
import { AnnualTaxLedger, AnnualTaxLedgerFact } from "../facts/ledger.js";

/**
 * Rule id for aggregating annual tax components into a ledger.
 *
 * @since 0.1.0
 */
export const AnnualTaxLedgerRuleId = RuleId.make(
  "whattax/rules-au-income-tax/rule/AnnualTaxLedger"
);

/**
 * Aggregates income tax, LITO, and Medicare Levy into a single ledger.
 *
 * Order: [incomeTax (additive), lito (subtractive), medicareLevy (additive)]
 * The `rawLiability` is the direct sum — it can be negative when LITO exceeds
 * income tax. Flooring to zero is the calculator's responsibility.
 *
 * @since 0.1.0
 */
export const AnnualTaxLedgerLive = Layer.effect(AnnualTaxLedgerFact)(
  Effect.gen(function* () {
    const incomeTax = yield* IncomeTaxComponentFact;
    const lito = yield* LitoComponentFact;
    const medicareLevy = yield* MedicareLevyComponentFact;

    const components = [incomeTax, lito, medicareLevy] as const;
    const rawLiability = sumLedgerComponents(components);

    const trace = TraceNode.make({
      children: [incomeTax.trace, lito.trace, medicareLevy.trace],
      formula: "liability = incomeTax - lito + medicareLevy",
      inputs: {
        incomeTaxCents: incomeTax.amount.cents,
        litoCents: lito.amount.cents,
        medicareLevyCents: medicareLevy.amount.cents,
      },
      result: rawLiability,
      ruleId: AnnualTaxLedgerRuleId,
      sources: [],
      title: "Annual tax ledger (income tax + LITO + Medicare Levy)",
    });

    return new AnnualTaxLedger({ components, rawLiability, trace });
  })
);
