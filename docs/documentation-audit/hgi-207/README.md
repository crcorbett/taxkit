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
accepted lifecycle and receipt policies; it does not substitute for publication,
registry, deployment, provider, or external-readback authority.

| Decision | State | Effect on downstream work |
| --- | --- | --- |
| [Public MDX and navigation lifecycle](public-mdx-lifecycle.json) | Accepted | `draft` is an authored, locally renderable, visibly labelled candidate; `published` is explicitly accepted current public documentation. Neither proves external availability. |
| [Archive movement and lifecycle routing](archive-routing.json) | Accepted | HGI-202 through HGI-205 must retain paths and use strict lifecycle routing unless an approved manifest says otherwise. |
| [Release candidates](release-candidate-retention.json) | Accepted | Tarballs are transient local test inputs, deleted by their owning command; only sanitized commit/package/digest/check receipts may remain. |
| [Release logs and proof retention](release-proof-retention.json) | Accepted | Future durable proof is sanitized JSON under `docs/evidence/releases/**`; raw logs and secrets are prohibited and provider CI logs are transient. |
| [Publication and deployment non-claims](publication-deployment-nonclaims.json) | Accepted | HGI-202 through HGI-205 must not claim publication or deployment from local repository evidence. |

[Source receipt](source-receipt.json) records the exact local sources and
inventory supporting these records. Supersede an accepted decision through a
new record; preserve this record set and its receipt for provenance.
