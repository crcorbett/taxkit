---
"@taxkit/core": major
"@taxkit/rules-au-pay": major
"@taxkit/rules-au-income-tax": major
"@taxkit/rules-au-stsl": major
"@taxkit/calculators": major
"@taxkit/api-http": major
"@taxkit/api-rpc": major
"@taxkit/sdk": major
---

Trace formula/rounding and question help text now use nested Options that retain
missing, present undefined and present value keys. Descriptor question/artifact/
permission values use Option, while rule parameter arrays default to empty.
Update domain readers and constructors; transport codecs retain the same bytes.

Ordinary descriptor fields derive from one Schema owner. Rule service tuple
types read the native service Identifier and preserve empty tuple meaning.
The engine live Layer is separate from its service contract with existing
public entrypoints retained. SDK output narrowing validates a calculator's
domain report Type rather than decoding transport data again.

Existing tax formulas, amounts, saved snapshots, tables and source records
remain unchanged. The Medicare decision and wider request/rate work remain open.
