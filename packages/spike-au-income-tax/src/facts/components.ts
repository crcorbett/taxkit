import { Context } from "effect";
import { makeFactDescriptor } from "@whattax/core";
import type { LedgerComponent } from "@whattax/core/ledger";

export class IncomeTaxComponentFact extends Context.Service<
  IncomeTaxComponentFact,
  LedgerComponent
>()("whattax/spike-au-income-tax/fact/IncomeTaxComponent") {}

export const IncomeTaxComponentDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-income-tax/fact/IncomeTaxComponent",
  title: "Income tax at marginal rates",
  authority: "derived",
  tag: IncomeTaxComponentFact,
});

export class LitoComponentFact extends Context.Service<
  LitoComponentFact,
  LedgerComponent
>()("whattax/spike-au-income-tax/fact/LitoComponent") {}

export const LitoComponentDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-income-tax/fact/LitoComponent",
  title: "Low Income Tax Offset",
  authority: "derived",
  tag: LitoComponentFact,
});

export class MedicareLevyComponentFact extends Context.Service<
  MedicareLevyComponentFact,
  LedgerComponent
>()("whattax/spike-au-income-tax/fact/MedicareLevyComponent") {}

export const MedicareLevyComponentDescriptor = makeFactDescriptor({
  id: "whattax/spike-au-income-tax/fact/MedicareLevyComponent",
  title: "Medicare Levy",
  authority: "derived",
  tag: MedicareLevyComponentFact,
});
