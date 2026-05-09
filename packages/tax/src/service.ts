import { Context, type Effect } from "effect";

import type { TaxBrief } from "./schemas";

export interface IWhatTaxService {
  readonly getBrief: () => Effect.Effect<TaxBrief>;
}

export class WhatTaxService extends Context.Service<
  WhatTaxService,
  IWhatTaxService
>()("@packages/tax/WhatTaxService") {}
