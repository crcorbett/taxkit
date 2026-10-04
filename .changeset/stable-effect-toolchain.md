---
"@taxkit/core": major
"@taxkit/api-http": major
"@taxkit/calculators": major
"@taxkit/rules-au-income-tax": major
"@taxkit/rules-au-pay": major
"@taxkit/rules-au-stsl": major
"@taxkit/sdk": major
"@taxkit/testing": major
"@taxkit/tsconfig": major
---

Require stable Effect 4.0.0 and migrate HTTP, process and encoding imports to its stable module paths. Upgrade the shared compiler configuration to TypeScript 7.0.2 and the supported native Effect diagnostic tool. Consumers must use the stable Effect graph instead of the release-candidate graph. This is a deliberate compatibility boundary for the fixed release train; calculator inputs, supported 2025–26 scope, retained results and the OpenAPI document are unchanged.
