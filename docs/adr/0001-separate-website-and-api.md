# Rebuild the application layer with a separate website and API

Status: accepted; partly superseded by ADR-0006 (native HTTP replaced Website RPC)

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

[ADR 0006](0006-follow-common-practice.md) replaced the Website RPC with the
generated HTTP client described in [API and SDK](../architecture/api-and-sdk.md).
The separate Website and API remain.
