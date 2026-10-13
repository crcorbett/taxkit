---
document_type: architecture-decision
lifecycle: current
authority: supporting
owner: taxkit-architecture-owner
last_reviewed: 2026-10-10
review_trigger: supported API host, shared package dependency or host composition changes
---

# Keep Bun and Cloudflare as independent API hosts

Cooper agreed on 10 October 2026 that both the standalone Bun API and the
Cloudflare API remain supported. Shared calculation and transport packages must
work without knowing which host runs them. Each app host supplies its server,
configuration and platform services to the same checked operations.

Cloudflare setup is the priority. Bun remains supported at its current HTTP
coverage and uses the same shared packages; equal RPC/MCP coverage is not part
of this change. Its application-wide calculation pool correction follows the
Cloudflare work.

Keeping two hosts allows callers to run TaxKit outside Cloudflare without a second implementation of tax rules.
The [foundation review](../product-specs/common-practice-foundation-review.md)
must check this against both upstream Effect and Alchemy sources and the
installed package types. This is an agreed design constraint, not proof that
both hosts currently expose identical features or that a deployment passed.
