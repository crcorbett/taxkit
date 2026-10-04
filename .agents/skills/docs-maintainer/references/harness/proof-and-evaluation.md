# Proof, delivery, evaluation, and lifecycle

## Claim-to-proof rule

For every material claim, name:

- exact repository revision and candidate artifact or configuration identity;
- actor, authority, environment, and observation time;
- critical journey or boundary;
- expected and observed postconditions;
- external readback when the claim crosses a provider boundary;
- limitations, non-claims, and plausible imitation rejected by the oracle;
- rollback or recovery identity; and
- addressable receipt.

Keep source consistency, unit behavior, consumer behavior, preview,
production, provider configuration, public behavior, publication, deployment,
and release as separate claims.

For every material normative requirement, including each `must`, `required`,
`never`, and accepted audit finding, maintain a requirement-to-proof crosswalk
with:

- the owning task;
- a direct observable and expected postcondition;
- a plausible false green that the oracle rejects;
- the focused command or procedure owner;
- the evidence owner and receipt path; and
- limitations and non-claims.

Reject proof by proxy. Broad suite coverage, successful construction, source
layout, or a neighbouring assertion does not establish the named behavior.
Decompose compound policy into separately observable properties. For example,
retry proof distinguishes eligibility, bounded attempts, backoff, jitter,
idempotent reads, uncertain writes, and observation after timeout when those
properties apply.

## Delivery identity

Prefer delivering the immutable artifact already proved. If a privileged stage
rebuilds it, bind source, configuration, inputs, outputs, and provider readback
or narrow the claim. Include review, CI, approval, release, deployment,
observation, and recovery only when the accepted outcome crosses them.

## Critical journeys

Keep a small inventory of consumer-visible or operator-visible jobs. Each
journey records actor, starting state, input, boundary, procedure owner,
expected behavior and side effects, preserved invariants, an oracle against a
plausible false green, environment, authority, evidence route, and non-claims.
Do not turn every unit test into a critical journey.

## Proportional verification

Ordinary work uses focused native checks, affected real journeys, normal
repository closeout, and one fresh independent review when risk justifies it.
Do not prescribe fixed pass, agent, file, command, or epoch counts.

Only evaluate a harness intervention comparatively when claiming it changes
future worker behavior. Freeze model, host, tools, runtime, skills, target,
authority, scenario, grader, and context projection. Measure:

- worker duration;
- worker feedback latency;
- synchronous human attention; and
- time to accepted outcome.

Return `retain`, `revise`, `remove`, or `inconclusive`. One before-and-after run
may guide a bounded decision but does not establish general causation.

## Terminal lifecycle

Every job ends as `accepted`, `failed`, `blocked`, `deferred`, `no_op`,
`superseded`, or `inconclusive`. Non-accepted states record attempted work,
last successful step, observed state, receipts, owner, escalation, recovery or
resume trigger, smallest unresolved choice, successor, and non-claims. Retain
the evidence outside the default retrieval route.

When review finds a gap after task acceptance, reopen the owning task and
invalidate affected downstream acceptance, candidate identity, rollback
identity, and receipts. Refresh focused proof before restoring acceptance. A
SPEC-required terminal audit runs once after every implementation dependency is
terminal. Any later implementation invalidates that terminal status and
requires one fresh final audit on the exact receipt-bearing state.
