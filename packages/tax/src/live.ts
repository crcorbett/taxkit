import { Effect, Layer } from "effect";

import type { TaxBrief } from "./schemas";
import { WhatTaxService } from "./service";

const brief: TaxBrief = {
  headline: "Tax questions, modeled explicitly.",
  questions: [
    {
      jurisdiction: "AU",
      summary: "Capture the facts that change which tax rules apply.",
      topic: "Residency",
    },
    {
      jurisdiction: "US",
      summary: "Separate eligibility questions from calculation rules.",
      topic: "Filing status",
    },
    {
      jurisdiction: "UK",
      summary: "Keep thresholds versioned and auditable.",
      topic: "Allowances",
    },
  ],
};

export const WhatTaxLive = Layer.succeed(
  WhatTaxService,
  WhatTaxService.of({
    getBrief: () => Effect.succeed(brief),
  })
);
