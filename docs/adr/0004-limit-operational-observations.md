---
document_type: architecture-decision
lifecycle: current
authority: supporting
owner: taxkit-architecture-owner
last_reviewed: 2026-10-10
review_trigger: operational signal fields, collection destination or privacy policy changes
---

# Keep operational observations separate from calculation values

Cooper agreed on 10 October 2026 to allow only safe operational details in the
Axiom and Cloudflare logging and metrics design: fixed fields such as stage,
route, duration and safe error name. Salaries, calculation facts, results and
calculation traces are excluded. This makes operational diagnosis less detailed
but keeps financial circumstances out of the signal store.

The policy applies to platform-generated records as well as application logs.
URLs, request headers and raw errors need separate field-level review before
export because they can contain financial or identifying values. The
[foundation review](../product-specs/common-practice-foundation-review.md)
will propose the exact field and destination contracts. It does not authorise
collection, provider configuration, secrets, billing or deployment. PostHog
remains postponed. The earlier [shared-dataset proposal](0002-reuse-shared-telemetry-datasets.md)
retains its history; its destination and collection choices are not approved by
this decision.
