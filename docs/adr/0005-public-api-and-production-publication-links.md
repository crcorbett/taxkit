---
document_type: architecture-decision
lifecycle: current
authority: supporting
owner: taxkit-architecture-owner
last_reviewed: 2026-10-13
review_trigger: public browser access, publication address or remote MCP origin policy changes
---

# Public browser API and Production publication links

On 13 October 2026 Cooper chose Common Practice's public, credential-free
browser API policy and fixed Production publication links. Pages and discovery
documents name `https://taxkit.dev`, including in Preview; API endpoint entries
still name their actual stage's API. Each host keeps its own native address,
and Website receives the API address/binding without a reverse dependency.
This makes publication links consistent and removes the circular deployment
graph, at the cost of replacing stage-specific publication links.

Remote MCP has a separate native policy: Origin-less desktop/server clients
remain supported, and the initial browser list is `https://taxkit.dev`. Add
other browser sites only for a known need. No Effect predicate patch is selected.
TaxKit's on-page tools remain independent of that remote endpoint policy.

[API and SDK](../architecture/api-and-sdk.md) owns the current caller, rate,
body and work checks and safe errors.
This records the agreed design; it does not claim deployed behaviour.
