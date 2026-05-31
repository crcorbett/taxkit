import { aud } from "@whattax/core/primitives";
import { WhatTax } from "@whattax/sdk";
import { au } from "@whattax/sdk/au";

const invalidInput = await Response.json({
  taxableIncome: aud(9_000_000),
}).json();

const result = await WhatTax.safe.calculate(
  au.calculations.takeHomePay,
  invalidInput
);

if (result._tag === "WhatTaxFailure") {
  console.log(result.error.error._tag);
}
