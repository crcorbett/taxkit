---
"@taxkit/core": minor
"taxkit": minor
---

Add `MoneyFromDollarsString` and `moneyFromDollarsString`, an Effect Schema
codec from typed dollar text to non-negative `Money`. It converts exactly to
whole cents and refuses blank, unplain or unsafe amounts with a typed reason
(`DollarsTextIssue`) and a replaceable message.
