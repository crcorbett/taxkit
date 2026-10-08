---
"@taxkit/rules-au-income-tax": major
"@taxkit/rules-au-pay": major
"@taxkit/rules-au-stsl": major
---

Public parameter Schemas now reject invalid row ranges and local rates, empty
or incomplete tables, gaps, overlaps and open middle bounds. Schedule 1 checks
both supported scales independently; STSL checks inclusive weekly cent coverage.
Income tax and LITO begin at a zero threshold with adjacent brackets. Medicare
checks threshold order and positive full/shade-in rate relationships.

Owning fallible constructors and saved-data Schemas enforce the same checks.
Generic decimal brands and signed Schedule 1 dollar coefficients stay open.
Retained table values, source records, encoded bytes, supported years and known
calculator results are unchanged. This does not correct the unresolved Medicare
thresholds or publish packages.
