# Documentation change-impact matrix

Use this matrix as prompts for an evidence-backed decision, not as a demand to
edit every row. Record `Change required`, `Preserve`, or `N/A` for affected
surfaces.

| Change                                       | Inspect and usually update                                                             | Additional proof                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Command, script, env var, setup              | Owning README, contributor/setup reference, runbook if operational                     | Command help/output and focused execution                     |
| Public export or package path                | Package README, public API reference, examples, generated export/reference owner       | Packed or consumer journey                                    |
| HTTP, RPC, event, or Schema boundary         | API/reference source, generated output, architecture boundary, migration guidance      | Encode/decode and consumer journey                            |
| Effect service, Layer, error, client wrapper | Architecture/standard, package README when consumer-visible, test-layer guidance       | Focused typed failure and boundary tests                      |
| React route or user-visible behavior         | Product/route owner, accessibility states, critical journey                            | Browser/runtime journey, not snapshots alone                  |
| Config, lint, formatter, typecheck           | Standards, contributor commands, CI contract, exceptions                               | Focused negative fixture and canonical check                  |
| CI/workflow/release                          | Authority model, runbook, artifact identity, rollback, proof schema                    | Workflow receipt and environment readback                     |
| Infrastructure/provider/cache                | Desired-state architecture, authority matrix, target runbooks, observability, recovery | Dated provider readback and public journey                    |
| Secret/credential/auth                       | Authority/custody owner and runbook; never secret values                               | Principal, resource, environment, duration/revocation receipt |
| Database/data model/migration                | Schema/data architecture, migration/recovery runbook, API consumer docs                | Migration and rollback/postcondition proof                    |
| Skill/agent instruction                      | Owning skill, metadata, mirrors, local profile, skill policy                           | Validator plus fresh-context behavior                         |
| SPEC/task/decision                           | Active SPEC/tasks, index/lifecycle pointers, downstream artifact ledger                | Task validator and claim-matched acceptance                   |
| Incident or repeated review finding          | Earliest enforceable owner plus evidence archive                                       | Negative then positive regression proof                       |

## Repository-profile interface

A portable local `docs-maintainer` skill or one-level `repository-profile.md`
must name, without copying their contents:

- docs router and lifecycle vocabulary;
- architecture, standards, API/reference, public-docs, and generated owners;
- root/package/app README responsibilities;
- runbook, authority, critical-journey, proof, and evidence locations;
- active SPEC/task and archive routes;
- exact docs, generated, skill/mirror, lint, typecheck, test, build, and journey
  commands that already exist;
- changed-path or semantic triggers, justified exclusions, and known gaps;
- local/global skill precedence and clean-clone portability.

The profile must work from the repository alone. It must not require a personal
absolute path or the global skill installation.

## Impact-ledger row

Record each decision with this shape:

```text
Surface:
Decision: Change required | Preserve | N/A
Trigger/evidence:
Semantic owner:
Paths:
Edit or preservation reason:
Lifecycle/generated action:
Verification/postcondition:
Proof path:
Non-claims:
```

An `N/A` without a trigger-specific reason is incomplete. A passing docs check
does not establish semantic correctness; require a fresh review for changed
claims and a runtime/provider journey when the claim crosses that boundary.
