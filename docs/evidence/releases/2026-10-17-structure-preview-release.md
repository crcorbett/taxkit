---
document_type: release-evidence
lifecycle: evidence
authority: supporting
owner: repository-maintainers
last_reviewed: 2026-10-17
---

# Structure improvements — preview release, 17 October 2026

The maintainer requested implementation of strict structure-review findings
5–11 with coordinated Sol High agents, followed by a local preview deployment
and live checks. This records that preview operation, not current provider
state or Production authority. The workflow used the published Development
Workflows plugin 0.11.3 and Common Practice comparison revision
`c18b4ad5053da23e8c64340035cc98098035ca54`.

## Source and scope

[PR #183](https://github.com/crcorbett/taxkit/pull/183) remains open. The deployed
source commit is `24a0d89beb894a6b1eb2f9ad994be1862f2937dc`; this evidence is a
later documentation-only commit and does not claim its own revision was deployed.

- Content-owned response correlation rejects a valid docs reply for another page.
- Independent Website settings and API capabilities preserve each valid capability
  when unrelated configuration fails.
- Root Alchemy composition joins the API implementation with lightweight
  infrastructure declarations; workspace checks reject reverse app dependencies.
- Observability, MCP transport, analytics policy and publication output have
  explicit package owners. HTTP owns shared route paths; Content remains independent
  of HTTP. Calculator Atoms and page coordination remain Website-owned.
- Owner documentation and a pending Changeset accompany the implementation.

Native testing also exposed a modern MCP disconnect leak. Workerd
could discard an aborted invocation before Effect released its calculation
place. An interruption-safe native `waitUntil` observer now keeps the existing
bounded handler alive through cleanup; calculations retain their original
request fibre, scope and five-second work budget. The regression requires all
eight cleanup events and eight newly entered concurrent operations followed by
their cleanup.

Request telemetry had been able to satisfy lifecycle-log assertions. The MCP
and RPC tests now separate checked request records from runtime lifecycle events
while retaining every raw record for privacy checks. Extraction also required a
fixture-only native bundler alias: the accelerated alarm reads the patched MCP
Schema source, while guards confirm ordinary source and compiled owners retain
the ten-minute session lifetime. The real alarm must release 32 held operations
without a follow-up request.

## Verification and CI

The clean source checkout used Bun 1.4.2, Node 24.19.0, Effect 4.0.2 and Alchemy
2.0.0-beta.81. Frozen-lockfile installation passed; dependencies were not upgraded.
`bun run verification` passed at the deployed source revision:

- build, formatting, lint, types, Effect compatibility and both Knip graphs;
- 544 tooling tests, 992 package/application tests and 52 Chromium browser tests;
- documentation checks for 184 documents and path checks for 1,560 tracked files.

The separately built native pair passed all 22 tests across 11 files. Changeset
status passed. Independent structural review found no additional actionable
regressions; native lifecycle claims rely on the executable tests above.

[CI Checks](https://github.com/crcorbett/taxkit/actions/runs/39002568818) passed
at the deployed revision. The [CI preview run](https://github.com/crcorbett/taxkit/actions/runs/39002568790)
passed verification but failed before planning because its `DOPPLER_TOKEN` was
empty. The workflow was completed and idle before local apply. No CI settings,
credentials or branch protection were changed.

The later evidence-only commit uses `[skip ci]` to avoid starting another preview
attempt. The successful CI and local verification claims above apply to the
deployed source revision, not to a separate runtime release of this record.

## Native preview deployment

Native Alchemy read Doppler `taxkit/stg_preview` and deployed only
`TaxKitAppsCloudflare/pr-183` from the clean source revision. The reviewed plan
created two Workers with eleven bindings; it contained no zone, Production or
telemetry-stack operations. Apply completed at 04:38:14 UTC. A fresh native
plan at 04:38:33 UTC reported **no changes** for both Workers and every binding.

| Host | Preview address | Active version (100%) |
| --- | --- | --- |
| Website | <https://taxkitappscloudflare-taxkitwebt27owbfqyo42nobn4xe5iemm.coopercorbett.workers.dev> | `128c341c-d831-4e39-9ee4-05cafa79d53a` |
| API | <https://taxkitappscloudflare-taxkitapi-pr-183-fib26wfgi53l5szz.coopercorbett.workers.dev> | `b3a09db5-f26d-4d8b-a115-40ba0a4cbcd5` |

Cloudflare deployment/settings readback confirmed these active versions and
the Website's `TAXKIT_API` service binding targeting the exact preview API Worker.
Cloudflare labels that Worker's deployment environment `production`; the target
script is the `pr-183` API above, not TaxKit's Production API. Both settings
responses reported no configured observability object, consistent with the
preview declaration's disabled platform channels.

## Live checks

The final run at 04:40:04–04:40:18 UTC passed all 20 live checks against the
addresses above:

- Hydrated and no-JavaScript calculations, direct API calculation and both MCP
  protocols returned $1,196 take-home and $304 withholding for $1,500 weekly
  gross with the tax-free threshold claimed.
- API health, three-calculator catalogue, input Schema, rule graph and fourteen
  OpenAPI paths passed. Invalid facts returned 400; calculation and error replies
  were uncached. Repeated public reads returned `CF-Cache-Status: HIT` with `Age`.
- Quickstart rendered with hydration; docs navigation, search and Markdown
  worked. All 62 discovery Markdown links used the preview API. Canonical
  publication URLs intentionally remained `https://taxkit.dev` and were inspected
  as text only. A valid overview reply injected for Quickstart was rejected with
  the expected safe Website load failure.
- Browser edit and route-departure cancellation produced `ERR_ABORTED` and no
  stale result. This held a live API response at browser delivery; it does not
  establish provider-side cancellation. Real Chromium cross-origin GET and
  calculation POST succeeded without credentials.
- Official MCP clients completed all six tools under `2026-07-28` and
  `2025-11-25`; only the older protocol allocated a session. Originless access
  worked, the configured publication origin was accepted, and foreign origins
  returned 403 under both protocols.
- Analytics relay probes returned empty/redacted 404 responses with `no-store`:
  this preview has analytics disabled. These outcomes do not independently prove
  each enabled-policy refusal branch or upstream delivery.
- Normal browser journeys had zero unexpected console/runtime errors and no
  unexpected egress. The exact expected `WebsiteLoadError` from the controlled
  docs mismatch was recorded separately.

The first run passed 18 of 20 checks. Its modern-origin probe incorrectly sent
legacy `initialize` to the modern protocol, and a blanket console assertion
counted the intentional docs failure and a deliberately missing departure route.
The harness switched to the official modern client, used a real departure route,
and isolated the exact injected fault diagnostic. The complete corrected run
passed without changing deployed code; the initial failed results were retained.

Twelve captured API/MCP payloads were separately decoded with their owning
Schemas. Browser screenshots cover hydrated, no-JavaScript and docs views. Only
the supplied preview hosts were contacted; redirect and browser egress guards
prevented following canonical Production URLs. The public catalogue does not
expose salary sacrifice, so the separate rule-pack sacrifice regression is not
claimed as a live public API test.

## Limits

This release did not merge the PR, deploy Production, change provider credentials
or CI settings, or publish npm packages. The Changeset remains pending. Preview
tests do not establish PostHog/Axiom ingestion or retention. The modern remote
MCP contract remains cleanup by the existing work deadline, not prompt TCP-abort
cancellation. Provider state is a dated observation and may change later.
