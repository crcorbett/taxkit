---
"@taxkit/core": minor
"taxkit": minor
---

Add `moneyFromDollarsText`, which reads typed dollar text as non-negative
`Money` exactly and fails with `InvalidDollarsText` and a matchable `reason`
(`empty`, `format` or `range`). `dollarsTextFromMoney` writes Money back as
plain dollars, and `MoneyFromDollarsString` joins both as a Schema codec with
default messages.
