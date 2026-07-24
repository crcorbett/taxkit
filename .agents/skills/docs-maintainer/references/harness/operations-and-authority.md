# Operations, authority, feedback, and automation

## Skills and runbooks

Skills own applicability, judgment, selection, invariants, routes, output shape,
and stop conditions. Target-owned runbooks own:

- applicability and preconditions;
- principal and authenticated identity;
- exact resource, operation, and environment;
- sequential steps and expected postconditions;
- bounded evidence and omitted-detail location;
- approval boundary, duration, and revocation;
- rollback, recovery, and escalation; and
- limitations and non-claims.

A procedure embedded in architecture, a README, or a skill is an ownership
defect. Move it to the target runbook and leave rationale plus a pointer.

## Authority decision

Before a consequential operation, populate an authority envelope. Mutation
requires a named approval receipt. Inspection or local editing never implies
authority to publish, release, deploy, mutate providers, change credentials, or
destroy resources.

Stop when identity, operation, resource, environment, duration, revocation,
approval, readback, rollback, or escalation is unknown. A worker may prepare
the operation while leaving the cutover unexecuted.

## Feedback promotion

Promote a repeated failure to the earliest suitable owner in this order:

1. domain model, Schema, type, or state machine;
2. preferred API, service, package, or component boundary;
3. lint rule, test, fixture, generator, or tool diagnostic;
4. target-owned runbook; then
5. canonical routing or judgment-heavy policy.

Record the failure class, concrete evidence, accepted correction, false-positive
and repair cost, owner, review trigger, carrying cost, retirement condition, and
weaker reminders to remove.

## Automation admission

Continuous work is allowed only when every field is settled:

- observable signal;
- durable state;
- scoped authority;
- bounded work and failure;
- idempotence or explicit convergence;
- proof on every run;
- accountable owner;
- stop, rollback, recovery, and escalation;
- retirement condition and disconfirming evidence.

Keep invention, ambiguous classification, novel architecture, and unproved
destructive cleanup foregrounded. Begin uncertain maintenance report-only.
