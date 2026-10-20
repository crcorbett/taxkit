---
document_type: architecture-decision
lifecycle: superseded
authority: supporting
owner: taxkit-architecture-owner
last_reviewed: 2026-10-18
review_trigger: website/API boundary, rebuild scope, or final design agreement
successor: ../architecture/api-and-sdk.md
reason: The foundation review replaced Website RPC with native HTTP; the separate application and API boundary remains.
---

# Rebuild the application layer with a separate website and API

Native Website HTTP, described in [API and SDK](../architecture/api-and-sdk.md),
supersedes this Website RPC direction. The original decision below is retained
as history; the separate Website/API boundary remains.

Cooper selected a fresh website and application foundation while retaining the
TaxKit calculation packages. A separate backend will give the website and agent
tools the same calculation operations, while each app keeps a clear execution
and deployment owner. This requires rebuilding and checking the application
connections together, instead of gradually extending the current docs site
and starter web app.

The website uses native Effect RPC for named backend operations with checked
inputs, results and errors. Server rendering uses the private backend binding;
browser calls use the matching stage's API address. Public HTTP/OpenAPI and MCP
remain separate adapters over the same application operations. The browser has
no second tax-engine implementation.

This keeps one calculation owner and allows both apps to change together with a
checked contract. It also couples the website to the selected native RPC
version, so wire errors, privacy, deadlines, cancellation and version agreement
need actual qualification. Public HTTP and MCP retain independent compatibility
contracts for external callers; they do not mirror calculation rules.

The separate apps and RPC direction are agreed in Q7/Q9; implementation awaits
final shared understanding of the complete proposed contract.
