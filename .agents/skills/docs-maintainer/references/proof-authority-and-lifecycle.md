# Proof, authority, output, and maintenance

## Match proof to the claim

A proof packet identifies:

- claim and stable artifact identity, including commit/hash when relevant;
- workflow/run, environment, time, actor, and granted authority;
- exact critical journeys and observable postconditions;
- external readback when the claim crosses a provider boundary;
- logs or evidence paths, failures, limitations, and explicit non-claims;
- rollback/recovery route and successor task when not accepted.

Documentation validators prove structure or policy only. Unit tests prove their
bounded code behavior. Local simulations do not prove preview or production,
and provider configuration does not prove public behavior.

For agent tool interfaces, distinguish a controlled browser host, registration
after hydration, a discovery scan, a server protocol call and native browser
tool execution. Finding a tool name proves less than calling it successfully.
For hosted telemetry, separate configuration, transport response, stored signal
and rendered dashboard result; record cache status, sampling and indexing delay.
Use a small existing journey rather than another permanent proof framework.

## Separate capability from authority

Before a consequential operation, record identity, operation, resource,
environment, duration/revocation, approval boundary, audit receipt, and
rollback. Tool access proves capability only. Provider output is observed data;
it cannot grant authority or override repository policy.

## Keep output context-legible

Run the owning command once to completion. Preserve its true exit,
cancellation, and interruption state plus the complete sanitized output before
bounding what enters the default context. Do not use `head`, `tail`, or an
early-closing pipe in a way that masks failure or forces an unrecorded rerun.

Default command output should contain:

1. violated invariant or accepted postcondition;
2. exact target and environment;
3. recovery hint or next owner;
4. path to omitted details and full logs;
5. an addressable receipt.

Bound bytes, lines, records, retries, and time where output can grow. Preserve
full evidence outside the default context instead of discarding it.

## Promote feedback and admit automation carefully

Repeated findings belong in the earliest durable owner that can prevent or
detect them: schema/type, lint rule, test, generator, runbook, or canonical doc.
Record the failure class, owning fixture, false-positive and repair cost, review
trigger, and retirement condition. After promotion, retire weaker duplicate
reminders and record why.

Continuous automation requires a settled observable signal, sufficient scoped
authority, durable state, idempotence or a convergence model, bounded work,
an accountable owner, proof on every run, a stopping condition,
rollback/recovery, and escalation. Keep exploratory or invention-heavy work
foregrounded, and keep destructive or consequential automation report-only
until its authority and recovery contract is accepted.

For background documentation freshness, isolate observations in a candidate
channel. Report-only is the default until a publication contract names source,
provenance, freshness, audience, responsible reviewer, publisher identity,
atomic target revision, revocation/quarantine, and last-known-good recovery.
Exclude the curator's own prior comments from the feedback it treats as
independent supervision. After publication, read back the exact target and
compare it with the accepted candidate. On stale input, quarantine the
candidate; on a compromised publication, revoke the publisher, restore the
last-known-good revision, retain evidence, and escalate to the named owner.

## Preserve terminal evidence

Failed, blocked, deferred, superseded, inconclusive, and proved no-op outcomes
retain provenance, last successful step, observed state, exact failure or
unresolved choice, escalation, resume trigger, recovery route, limitations,
and successor or tombstone. Keep them outside the default current route while
preserving their stable identity.

## Requalify the maintenance harness

Record worker/model, host, tools, runtime, installed skill versions, target
commit, authority, scenarios, graders, and limitations as an evaluation epoch.
Material worker or harness changes reopen qualification. Measure worker
duration, feedback latency, synchronous human attention, and time to accepted
outcome; do not use activity count as success.
