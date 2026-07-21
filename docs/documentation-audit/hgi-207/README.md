---
document_type: decision-index
lifecycle: evidence
authority: supporting
owner: taxkit-documentation-owner
last_reviewed: 2026-07-21
review_trigger: product-owner decision, public-doc status change, retention-manifest approval, release artifact change, or publication/deployment capability change
---

# HGI-207 decision records

This is the accepted repository-local decision route for HGI-207. It records
evidence-backed defaults and explicit deferrals; it does not substitute for a
named product-owner, publication, registry, or deployment authority.

| Decision | State | Effect on downstream work |
| --- | --- | --- |
| [Public MDX and navigation lifecycle](public-mdx-lifecycle.json) | Deferred | HGI-202 cannot encode a semantic `draft` policy. |
| [Archive movement and lifecycle routing](archive-routing.json) | Accepted | HGI-202 through HGI-205 must retain paths and use strict lifecycle routing unless an approved manifest says otherwise. |
| [Immutable release candidates](release-candidate-retention.json) | Deferred | HGI-203 and HGI-204 cannot retain candidate tarballs as a governed class yet. |
| [Release logs and proof retention](release-proof-retention.json) | Deferred | HGI-203 and HGI-204 cannot prescribe full-log retention, redaction, or a canonical location yet. |
| [Publication and deployment non-claims](publication-deployment-nonclaims.json) | Accepted | HGI-202 through HGI-205 must not claim publication or deployment from local repository evidence. |

[Source receipt](source-receipt.json) records the exact local sources and
inventory supporting these records. Supersede an accepted decision through a
new record; preserve this record set and its receipt for provenance.
