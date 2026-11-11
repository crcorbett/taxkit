# TaxKit runbooks

Runbooks hold repeatable steps. Architecture documents explain the boundaries;
Git commits, pull requests, Alchemy state and the checks themselves are the
ordinary record of what happened.

| Runbook | Use it for |
| --- | --- |
| [Website and API deployment](./deployment.md) | Native Alchemy plan, deploy, drift, destroy and rollback for Preview and Production, the Checks workflow's deploy jobs and `[skip ci]` use. |
| [Versioning](./versioning.md) | Changesets, package versions, npm publication and release evidence. |
| [Packed consumer check](./packed-consumer-proof.md) | Packing the SDK and installing it in a fresh consumer. |

Start a new runbook from [the runbook template](./_template.md).

Publishing packages to npm or deploying the Website/API needs the maintainer's
explicit request for that operation. A local check does not show that a package
was published or that a deployment works.
