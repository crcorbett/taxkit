import {
  FactQuestion,
  FactQuestionId,
  makeFactDescriptor,
} from "@whattax/core";
import { LedgerComponent } from "@whattax/core/ledger";
import { Context, Schema } from "effect";

/**
 * Whether the employee has an STSL debt and wants STSL withholding included.
 *
 * `enabled: false` keeps the STSL component visible in the trace as disabled
 * when an STSL-aware pack is composed.
 *
 * @since 0.1.0
 *
 * @example
 * ```ts
 * import { StslDebt } from "@whattax/rules-au-stsl/facts"
 *
 * const stsl = new StslDebt({ enabled: true })
 * ```
 */
export class StslDebt extends Schema.TaggedClass<StslDebt>()("StslDebt", {
  enabled: Schema.Boolean,
}) {}

/**
 * Context tag for caller-provided STSL debt status.
 *
 * @since 0.1.0
 */
export class StslDebtFact extends Context.Service<StslDebtFact, StslDebt>()(
  "whattax/rules-au-stsl/fact/StslDebt"
) {}

/**
 * Fact descriptor for STSL debt status.
 *
 * @since 0.1.0
 */
export const StslDebtDescriptor = makeFactDescriptor({
  authority: "input",
  id: "whattax/rules-au-stsl/fact/StslDebt",
  question: new FactQuestion({
    id: FactQuestionId.make("whattax/rules-au-stsl/question/StslDebt"),
    inputKind: "boolean",
    prompt: "Study and training support loan debt",
  }),
  schema: StslDebt,
  tag: StslDebtFact,
  title: "Whether the employee has STSL debt and is opting into withholding",
});

/**
 * Context tag for the STSL withholding ledger component.
 *
 * @since 0.1.0
 */
export class StslComponentFact extends Context.Service<
  StslComponentFact,
  LedgerComponent
>()("whattax/rules-au-stsl/fact/StslComponent") {}

/**
 * Fact descriptor for the STSL withholding component.
 *
 * @since 0.1.0
 */
export const StslComponentDescriptor = makeFactDescriptor({
  authority: "derived",
  id: "whattax/rules-au-stsl/fact/StslComponent",
  schema: LedgerComponent,
  tag: StslComponentFact,
  title: "STSL withholding ledger component for a single pay period",
});
