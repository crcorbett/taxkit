---
document_type: architecture-decision
lifecycle: proposed
authority: supporting
owner: taxkit-architecture-owner
last_reviewed: 2026-10-03
review_trigger: dataset ownership, signal topology, identity policy or final design agreement
---

# Reuse the three shared Axiom datasets

Cooper selected the existing shared logs, traces and metrics datasets because
the account is limited to three. TaxKit will reference Site's existing resources
and own its own scoped ingestion token, destinations, dashboards and identity
filters. Site keeps ownership and retention policy for the datasets.

Sharing preserves capacity for every project but makes exact project, app and
stage filters essential. Resource references and safe fields must be checked;
shared storage is not access isolation or proof that events were delivered.
PostHog remains the owner of minimal product traffic/calculator counts; Axiom
owns operational observations without tax inputs or results.

The detailed contract and qualification work are in
[the proposed rebuild SPEC](../product-specs/clean-slate-foundation.md).
Implementation awaits final shared understanding; provider changes require a
reviewed exact-resource plan and its separate authority.
