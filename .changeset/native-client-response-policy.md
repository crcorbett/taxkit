---
"@taxkit/api-rpc": major
---

Bound private JSON replies to 2 MiB, apply one ten-second complete-response
client deadline, and return distinct safe status/size errors with manual retry
guidance. Preserve native RPC codecs, caller cancellation and no automatic retries.
