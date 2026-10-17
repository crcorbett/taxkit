---
document_type: release-evidence
lifecycle: evidence
authority: supporting
owner: repository-maintainers
last_reviewed: 2026-10-17
---

# Strict-review corrections — 17 October 2026

Status: released to Production locally and verified. The maintainer explicitly
requested fixes 1–4, a Changeset, checks, push, merge and release from local.
This records observations on 17 October; it is not current provider policy.
The workflow used the published Development Workflows plugin 0.11.1.

## Released change

[PR #181](https://github.com/crcorbett/taxkit/pull/181) merged to `main` as
`1a1a71c13e90b2fcd055261afbaf1613fb358f2c`:

1. Sacrifice-aware net pay now subtracts the sacrificed amount as well as tax.
   A $1,500 salary, $300 sacrifice and $208 PAYG yields $992, not $1,292.
   The previous pack reduced taxable gross but reused the net-pay rule that
   subtracted only the tax ledger. Golden tests repeated that omission.
2. PAYG keeps the exact decimal formula until the final whole-dollar rounding.
   The previous intermediate cent rounding moved near-half-dollar amounts
   across the final threshold. $1,014 weekly pay with the tax-free threshold
   now withholds $147 and returns $867. Independent boundary fixtures cover
   both scales; the pay ruleset identity is `rules-au-pay/1.0.1`.
3. Website discovery forwarding now uses the same bounded HTTP path as other
   API calls: a ten-second headers/body deadline, a two-MiB body limit and
   cancellation, preserving response status and headers.
4. Analytics now exports a static live Layer with native configuration.
   Worker composition and fixtures use that Layer directly.

The Changeset covers pay, STSL and analytics packages. It remains pending in
the existing package release train; this operation did not publish npm packages.

Full verification also exposed structural hashing of cyclic TypeScript ASTs
inside twelve vendored lint cycle guards. Reference-identity guards remove the
stall without weakening the checks. Completed Match expressions returning
Layers are now included in factory detection, with positive and negative
fixtures. The vendor README records these two local changes explicitly.

## CI and local verification

The source PR's [Checks run 38997747808](https://github.com/crcorbett/taxkit/actions/runs/38997747808)
completed successfully. The normal merge used `[skip ci]` in its subject to
keep the requested Production apply local. No branch protection or workflow
setting was bypassed. The Production workflow had no queued or running job
immediately before apply.

A clean detached worktree at the exact merge commit used Bun 1.4.2, Node
24.19.0 and a successful frozen-lockfile install. `bun run verification` passed:

- build, formatting, lint, types, Effect diagnostics and both Knip graphs;
- 520 tooling tests, 981 package/application tests and 49 browser tests;
- documentation checks for 180 documents and path checks for 1,510 files.

Before merge, packed SDK verification, a fresh downstream consumer, local API
smoke checks and Changeset status also passed. The downstream historical proof
initially rejected the intentional ruleset/trace identity change. Its adapter
now restores only that historical fixture's known fields; saved hashes and
monetary oracles were not regenerated. An initial dependency fetch stalled;
a single-request install warmed the cache and the fresh consumer then passed.

## Native deployment and readback

Native Alchemy 2.0.0-beta.81 read Production credentials from Doppler
`taxkit/prd`. Cloudflare credentials were not copied into environment files or
committed. The three stacks were planned in runbook order:

| Stack | Initial plan | Apply | Fresh plan |
| --- | --- | --- | --- |
| `TaxKitObservability/prod` | No changes | Not needed | Initial no-op plan at 03:18:11 UTC |
| `TaxKitTraceExport/prod` | No changes | Not needed | Initial no-op plan at 03:18:21 UTC |
| `TaxKitAppsCloudflare/prod` | Two updates: API and Website | Two succeeded at 03:20:30 UTC | No changes at 03:22:20 UTC |

There were no creates, replacements, deletions or adoptions. Cloudflare
readback confirmed these active versions, each at 100%:

| Worker | Version |
| --- | --- |
| API | `3ed63184-b128-44d7-9b90-22caccc4e2c4` |
| Website | `4ab6693f-cc54-41a1-bed5-d57ac2fcd345` |

The separate informational `production:drift` reported four resources.
A read-only inspection of the native drift comparison identified every field:

- Both Workers: `domain.zone` is present in saved attributes and omitted by
  provider readback, the known custom-domain representation discrepancy.
- DNSSEC: saved `pending`, observed `active`.
- Zone: only `modifiedOn`, saved 3 October and observed 13 October, changed.

No drift repair was performed. The fresh deployment plan remains the gate.
Cloudflare settings showed logs enabled at sampling rate 1, destination
`taxkit-axiom-logs`, persistence and invocation logs disabled, traces disabled,
and no Axiom binding on either Worker.

## Public verification

Twelve direct HTTP checks passed against `taxkit.dev` and `api.taxkit.dev`:
Website and health; quickstart HTML and Markdown; robots, sitemap and llms;
`www` 301 preserving path/query; two catalogue GETs, the second with
`CF-Cache-Status: HIT` and `Age`; a calculation POST; and a no-JavaScript form
POST. Both calculation responses were private (`no-store`). The API returned
$147 PAYG, $867 net and `rules-au-pay/1.0.1` for $1,014 weekly pay.

Real Chromium journeys returned $867 with JavaScript enabled and disabled.
A browser at a separate fixture origin successfully made the real cross-origin
calculation POST without credentials and received $867. Only the fixture
origin's HTML was synthetic; API requests reached Production.

The first direct no-JavaScript probe used the wrong form action,
`/calculators/au.pay.take-home`, and received 404. Source inspection confirmed
that the take-home form posts to `/`; the corrected probe and both real browser
journeys passed. This was a probe error, not a transport failure or a silently
retried wrong calculation. No transport failure occurred in these public checks.

## Documentation impact and limits

- Changed: owning pay, analytics and web READMEs, rule/calculator/testing
  architecture, active Common Practice SPEC/plan, vendored lint provenance,
  packed-consumer runbook and Changeset in PR #181.
- Changed here: this dated evidence and its documentation-router pointer;
  deployment runbook now directs version readback and the actual take-home
  form action, and replaces a stale billing/secret-availability assertion
  with a current-state check.
- Preserved: infrastructure topology, provider configuration, API Schemas,
  generated public reference sources and unrelated repository instructions.
- N/A: npm publication, package-version consumption and a new migration guide.

Preview behavior, npm registry publication, stored Axiom log envelopes and
rendered dashboard panels were not verified by this release record. Worker
logging configuration is verified; it does not prove ingestion or storage.
No salary-sacrifice endpoint is exposed by the public take-home calculator;
that correction is covered by domain regression tests, not the public probe.

Rollback uses the same native Production command from the previous working
commit `0433b39ec89605d01ee422176920633ce72a9551`, under the
[deployment runbook](../../runbooks/deployment.md). No rollback was needed.
