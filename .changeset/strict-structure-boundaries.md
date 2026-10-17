---
"@taxkit/content": patch
"@taxkit/api-http": patch
"@taxkit/api-rpc": patch
"@taxkit/analytics": patch
"@taxkit/infrastructure": patch
---

Reject documentation replies that do not match the requested page and keep Website settings available when its API binding fails.

Separate native host composition, observability, MCP, analytics relay and discovery publication into their owning packages. Centralize API paths while preserving HTTP/RPC/MCP wire contracts, private calculation admission and telemetry privacy.
