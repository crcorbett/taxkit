---
"@taxkit/sdk": minor
---

Ship the SDK as one self-contained TaxKit package with root, AU, Effect, Core
and HTTP entry points. Include the internal engine, calculators, rules and HTTP
contracts in the package instead of requiring separately published TaxKit
dependencies. Preserve existing SDK entry points, calculation results and
caller-owned lifetimes. Effect remains an external dependency.

Keep every workspace package private while preparing publication; this change
does not publish to npm.
