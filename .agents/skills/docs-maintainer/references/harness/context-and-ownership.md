# Context and ownership contract

## Truth precedence

Use the strongest applicable current owner:

1. external systems for current external actuality;
2. shared source stores for shared source material;
3. repository code, configuration, Schemas, manifests, and workflows for
   desired executable state;
4. architecture and standards for durable explanation and policy;
5. target-owned runbooks for repeatable operations;
6. dated proof and evidence for observations;
7. active SPECs and plans for current implementation intent; and
8. archives for historical, failed, superseded, or inconclusive material.

Link between layers. Do not copy mutable provider state, full procedures,
historical status, or executable contracts into weaker owners.

## Context phases

Every material job uses three phases:

| Phase       | Required context                                                                                                           | Forbidden shortcut                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Ground      | Target identity, worktree, root router, local profile, current task, directly affected owners                              | Inferring policy from a completed plan                        |
| Investigate | Only evidence needed to resolve named questions, including code, config, history, provider readback, or upstream libraries | Loading all archives as default context                       |
| Land        | Full affected-surface accounting, contradiction reconciliation, proof, lifecycle, and pointers                             | Updating one document while leaving a competing current owner |

Repository-wide audits inventory all readable repository-owned `docs/**` and
`README*`, but deeply read only current, canonical, affected, contradictory,
generated-owner, or evidence-critical material.

## Owner selection test

For each claim, answer:

1. Is the claim executable state, durable rationale, exact procedure, current
   intent, observed evidence, or history?
2. What is the earliest owner that can prevent or detect drift?
3. What weaker copies or reminders become redundant after correction?
4. What router or consumer pointers must remain?
5. What lifecycle transition or tombstone is required?

If two current artifacts claim the same authority, record an ownership defect.
Do not resolve it by adding a third summary.

## Candidate publication boundary

Background curation is report-only by default. A candidate records source,
provenance, freshness, classification, audience, proposed owner, target
revision, contradictions, responsible reviewer, publisher identity,
publication state, quarantine or revocation, last-known-good recovery, and
post-publication readback. A curator may not supervise or publish its own
uncorroborated output.
