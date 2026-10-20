---
document_type: runbook-index
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-20
review_trigger: release command, Changesets, package graph or deployment command change
---

# TaxKit runbooks

Runbooks hold repeatable steps. Architecture documents explain the boundaries;
Git commits, pull requests, Alchemy state and the checks themselves are the
ordinary record of what happened.

| Runbook | Use it for |
| --- | --- |
| [Website and API deployment](./deployment.md) | Native Alchemy plan, deploy, drift, destroy and rollback for Preview and Production, the Checks workflow's deploy jobs and `[skip ci]` use. |
| [Versioning](./versioning.md) | Changesets, package versions, changelogs and where release evidence lives. |
| [Packed consumer check](./packed-consumer-proof.md) | Packing the SDK and installing it in a fresh consumer. |

Publishing packages to npm or deploying the Website/API needs the maintainer's
explicit request for that operation. A local check does not show that a package
was published or that a deployment works.
