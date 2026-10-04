# Document classes and semantic ownership

Use one owner per claim. `canonical` describes authority; lifecycle describes
whether the document is current.

| Class                      | Owns                                                                         | Must not own                                                          | Typical review trigger                                                |
| -------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Router/index               | Small current navigation graph                                               | Full policy, completed-feature history, live state, copied procedures | Destination or lifecycle changes                                      |
| README                     | Entry point, setup, supported commands, public/package use                   | Full architecture, provider inventory, complete runbooks              | Setup, command, export, package, or app-entry changes                 |
| Architecture/ADR           | Durable design, boundaries, decisions, invariants                            | Sequential operations or mutable provider facts                       | Boundary, dependency, data-flow, authority-design changes             |
| Standard/policy            | Enforceable rules and exceptions                                             | One-off evidence or implementation history                            | Rule, lint, schema, or exception changes                              |
| API/reference              | Consumer contract and boundary semantics                                     | Unchecked examples or copied generated truth                          | Schema, route, RPC/HTTP, export, error, or version changes            |
| Generated reference        | Deterministic output from named source                                       | Hand-maintained competing truth                                       | Generator or source-schema changes                                    |
| Runbook                    | Preconditions, identity, authority, steps, evidence, rollback, escalation    | General teaching or architectural rationale                           | Operational target, command, provider, authority, or recovery changes |
| Critical-journey inventory | Small consumer-visible journey set and proof route                           | Every unit test or request permutation                                | User/consumer journey or release-claim changes                        |
| Proof packet               | Dated claim, artifact, environment, actor, journeys, observations, limits    | Durable policy or undocumented current state                          | Every execution or accepted release claim                             |
| Evidence archive           | Raw failed, inconclusive, superseded, or historical material with provenance | Default current guidance                                              | New evidence, retention, or successor changes                         |
| Skill                      | Judgment, selection, method, routes to local owners                          | Full runbook, live state, repository facts in a global skill          | Workflow, owner-interface, worker, or tool changes                    |
| Active SPEC/task           | Current intent, decisions, scope, dependencies, acceptance, status           | Completed-history narrative                                           | Requirement, implementation, decision, or proof changes               |

## Lifecycle

Use explicit states such as `proposed`, `active`, `superseded`, `historical`,
and `archived`. Define the repository's exact vocabulary in its local profile.
Every non-active current-looking document needs a successor or tombstone and a
reason. Historical evidence remains identifiable but must not sit on the
default current route.

## Pointer rule

Update the semantic owner first. Then update only the root/docs/package/app
indexes and cross-links needed for reliable retrieval. Delete or tombstone
competing prose; do not synchronize duplicate copies indefinitely.
