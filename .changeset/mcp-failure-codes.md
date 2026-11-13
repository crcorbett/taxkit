---
"api": minor
"web": patch
---

Report MCP and WebMCP tool failures by their real cause. A missing documentation page or calculator context now answers `not-found` (check the input) instead of `service-unavailable`; a client read that passes its ten-second deadline answers `operation-timeout`; and a WebMCP reply that is too large or does not match its Schema answers the new `server-fault` code. Listing calculators no longer reports a timeout it cannot have.
