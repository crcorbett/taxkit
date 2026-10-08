---
"@taxkit/api-rpc": major
"@taxkit/content": major
"@taxkit/api-http": patch
---

Add four checked native documentation operations and their separate client. The RPC server now requires the caller's ContentService as well as its calculator service. Keep calculator methods and revision 4, and check documentation revision 1 separately.

Own the bounded public page address and fixed page/search errors in the compiled content package, shared by HTTP and RPC. Both private JSON clients use the same scoped 2 MiB response reader; their existing error vocabularies stay separate.
