---
"@taxkit/calculators": major
"@taxkit/api-http": major
"@taxkit/api-rpc": major
"@taxkit/sdk": major
---

Add checked calculation capacity and operation-timeout errors to the canonical
service contract. API hosts share one eight-calculation pool with a five-second
operation budget. HTTP returns checked 503/504 envelopes and native RPC preserves
the same safe errors for manual retry. Tax calculations and retained results are
unchanged. The local SDK service remains caller-owned and has no server pool.
