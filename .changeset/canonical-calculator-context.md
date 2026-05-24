---
"@whattax/core": patch
"@whattax/calculators": patch
"@whattax/http-api": patch
"@whattax/rules-au-income-tax": patch
"@whattax/rules-au-pay": patch
---

Add canonical `CalculatorId` and `Jurisdiction` brands, move AU public
calculator IDs and supported jurisdiction/tax-year schemas into the owning AU
rule packages, then compose those canonical exports in `@whattax/calculators`.
The calculator service no longer mirrors request context or revalidates context
fields already narrowed by schemas. Public calculator input decode errors now
use calculator-specific names.
