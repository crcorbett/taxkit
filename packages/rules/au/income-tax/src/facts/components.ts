import { makeFactDescriptor } from "@whattax/core";
import { LedgerComponent } from "@whattax/core/ledger";
import { Context } from "effect";

/**
 * Context tag for the marginal-rate income tax ledger component.
 *
 * @since 0.1.0
 */
export class IncomeTaxComponentFact extends Context.Service<
  IncomeTaxComponentFact,
  LedgerComponent
>()("whattax/rules-au-income-tax/fact/IncomeTaxComponent") {}

/**
 * Fact descriptor for the marginal-rate income tax component.
 *
 * @since 0.1.0
 */
export const IncomeTaxComponentDescriptor = makeFactDescriptor({
  authority: "derived",
  id: "whattax/rules-au-income-tax/fact/IncomeTaxComponent",
  schema: LedgerComponent,
  tag: IncomeTaxComponentFact,
  title: "Income tax at marginal rates",
});

/**
 * Context tag for the Low Income Tax Offset ledger component.
 *
 * @since 0.1.0
 */
export class LitoComponentFact extends Context.Service<
  LitoComponentFact,
  LedgerComponent
>()("whattax/rules-au-income-tax/fact/LitoComponent") {}

/**
 * Fact descriptor for the Low Income Tax Offset component.
 *
 * @since 0.1.0
 */
export const LitoComponentDescriptor = makeFactDescriptor({
  authority: "derived",
  id: "whattax/rules-au-income-tax/fact/LitoComponent",
  schema: LedgerComponent,
  tag: LitoComponentFact,
  title: "Low Income Tax Offset",
});

/**
 * Context tag for the Medicare Levy ledger component.
 *
 * @since 0.1.0
 */
export class MedicareLevyComponentFact extends Context.Service<
  MedicareLevyComponentFact,
  LedgerComponent
>()("whattax/rules-au-income-tax/fact/MedicareLevyComponent") {}

/**
 * Fact descriptor for the Medicare Levy component.
 *
 * @since 0.1.0
 */
export const MedicareLevyComponentDescriptor = makeFactDescriptor({
  authority: "derived",
  id: "whattax/rules-au-income-tax/fact/MedicareLevyComponent",
  schema: LedgerComponent,
  tag: MedicareLevyComponentFact,
  title: "Medicare Levy",
});
