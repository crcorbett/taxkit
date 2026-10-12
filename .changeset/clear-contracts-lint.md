---
"@taxkit/core": major
"@taxkit/calculators": major
"@taxkit/rules-au-income-tax": major
"@taxkit/rules-au-pay": major
"@taxkit/rules-au-stsl": major
"@taxkit/docs-content": major
"@taxkit/docs-fumadocs": major
"@taxkit/api-http": minor
---

Adopt the stricter shared Oxlint policy and use precise public contract names.
Rename vague service `Shape` types to `Contract`, rename
`SourceExtract.shape` to `rowContract`, keep trace values JSON-safe, and add
preferred `create*` constructors while retaining deprecated `make*` aliases
where compatibility is safe.
