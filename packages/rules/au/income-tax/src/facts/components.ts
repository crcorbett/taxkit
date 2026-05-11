import { Context } from "effect";
import { makeFactDescriptor } from "@whattax/core";
import { LedgerComponent } from "@whattax/core/ledger";

export class IncomeTaxComponentFact extends Context.Service<
  IncomeTaxComponentFact,
  LedgerComponent
>()("whattax/rules-au-income-tax/fact/IncomeTaxComponent") {}

export const IncomeTaxComponentDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-income-tax/fact/IncomeTaxComponent",
  title: "Income tax at marginal rates",
  authority: "derived",
  schema: LedgerComponent,
  tag: IncomeTaxComponentFact,
});

export class LitoComponentFact extends Context.Service<
  LitoComponentFact,
  LedgerComponent
>()("whattax/rules-au-income-tax/fact/LitoComponent") {}

export const LitoComponentDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-income-tax/fact/LitoComponent",
  title: "Low Income Tax Offset",
  authority: "derived",
  schema: LedgerComponent,
  tag: LitoComponentFact,
});

export class MedicareLevyComponentFact extends Context.Service<
  MedicareLevyComponentFact,
  LedgerComponent
>()("whattax/rules-au-income-tax/fact/MedicareLevyComponent") {}

export const MedicareLevyComponentDescriptor = makeFactDescriptor({
  id: "whattax/rules-au-income-tax/fact/MedicareLevyComponent",
  title: "Medicare Levy",
  authority: "derived",
  schema: LedgerComponent,
  tag: MedicareLevyComponentFact,
});
