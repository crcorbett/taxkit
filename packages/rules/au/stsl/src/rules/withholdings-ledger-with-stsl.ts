import { Effect, Layer } from "effect";
import { GrossPayFact } from "@whattax/rules-au-pay/facts";
import { PayWithholdingsLedgerFact } from "@whattax/rules-au-pay/facts";
import { PaygWithholdingComponentFact } from "@whattax/rules-au-pay/facts";
import { buildPayWithholdingsLedger } from "@whattax/rules-au-pay/rules";
import { RuleId } from "@whattax/core/trace";
import { StslComponentFact } from "../facts/stsl.js";

export const PayWithholdingsLedgerWithStslRuleId = RuleId.make(
  "whattax/rules-au-stsl/rule/PayWithholdingsLedgerWithStsl",
);

/**
 * STSL-aware aggregator: combines PAYG and STSL components into the same
 * `PayWithholdingsLedgerFact` the base aggregator provides.
 *
 * Composition is *explicit*: a pack picks either this aggregator or the base
 * one — never both. Keeping it in the STSL package preserves the package
 * boundary; rules-au-pay does not depend on rules-au-stsl.
 */
export const PayWithholdingsLedgerWithStslLive = Layer.effect(
  PayWithholdingsLedgerFact,
)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;
    const payg = yield* PaygWithholdingComponentFact;
    const stsl = yield* StslComponentFact;
    return buildPayWithholdingsLedger([payg, stsl], gross.period);
  }),
);
