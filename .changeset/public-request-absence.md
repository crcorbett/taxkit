---
"@taxkit/calculators": major
"@taxkit/api-http": major
"@taxkit/api-rpc": major
"@taxkit/sdk": major
"@taxkit/docs-content": patch
---

Checked request context, help and filter values use nested Options that retain
missing, present undefined and present-value keys. Optional error and metadata
fields use the same owners, including explicit false permission. Constructors
default omitted fields; JSON, HTTP query and RPC representations stay unchanged.

SDK request types derive calculator constructor inputs and keep descriptor facts
typed. The selected calculator still decodes facts and supplies safe field help.
Typed callers and public Effect/HTTP templates use the canonical request values.
Existing tax results, tables, source records and OpenAPI snapshots are retained.
