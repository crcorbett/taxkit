---
document_type: harness-evaluation-epoch
lifecycle: current
authority: canonical
owner: taxkit-harness-owner
last_reviewed: 2026-07-22
review_trigger: worker, host, tool, runtime, skill, public-boundary, or release-graph change
---

# Harness evaluation epochs

HGI-206 qualifies only one recorded local TaxKit evaluation epoch. Its worker-visible
scenario contract is [`../../tools/evals/hgi-206-scenarios.json`](../../tools/evals/hgi-206-scenarios.json);
the independent grader remains outside that default context.

The independent portable-path re-audit accepted the corrected evidence
contract, and the semantic and validation closeout commits are recorded in
[`../documentation-audit/HGI-206-validation.json`](../documentation-audit/HGI-206-validation.json).
That acceptance does not widen the epoch beyond the target, scenarios, tools,
skills, limitations, or non-claims recorded here.

The target is accepted HGI-205 closeout
`a8a58882cd6c5f8003d31dc0c0567d78093597b9`. A result binds its worker/model,
host, tools, runtime, skill digests, target identity, retrieval, invocation and
relevance observations as one epoch. It is invalidated for requalification when
any listed review trigger changes.

The five current journeys are calculator, packed SDK consumer, HTTP API,
documentation runtime, and report-only release readiness. Their command,
boundary oracle, receipt and recovery owner live in the scenario contract.
Those commands establish local observations only; they never establish hosted
CI, Git publication, registry state, deployment, provider state, public-site
availability, or a future epoch.

Four clocks are independent: worker feedback latency, worker wall-clock,
synchronous human attention, and time to accepted outcome. Record a value only
from direct measurement for that clock. Otherwise retain `null` with its reason;
never infer it from a timestamp, another clock, or narrative.

Failed, deferred and inconclusive evaluation material remains under
`docs/documentation-audit/` and is not acceptance proof. Reversal of accepted
HGI-206 work is limited to reversing its identified task-scoped commit(s) in
reverse order while preserving all terminal receipts.
