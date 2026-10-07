---
document_type: product-spec
lifecycle: current
authority: canonical
owner: taxkit-au-income-tax-owner
last_reviewed: 2026-10-08
review_trigger: Medicare source, annual rule edition or consumer qualification change
---

# Correct the 2025–26 annual Medicare table

Cooper approved this correction on 8 October in the adad delivery conversation.
This supersedes the retained-result requirement only for affected annual Medicare
results. The first adad release remains 2025–26. The separate rebuild continues
under its [owning plan](../exec-plans/active/clean-slate-foundation.md).

## Outcome and scope

Correct the single-person, non-SAPTO Medicare table in
`packages/rules/au/income-tax/src/parameters/medicare-levy-table.ts` from
$27,222/$34,027 to $28,011/$35,013. Keep the existing nil, 10% shade-in and 2%
full-rate algorithm. Section 7(2) of the Medicare Levy Act includes the phase-in
limit itself. The enacted amendment is Schedule 5 items 3, 5 and 14 of
[Act No. 58 of 2026](https://www.legislation.gov.au/C2026A00058/asmade/2026-06-30/text/original/pdf).
Record the downloaded PDF checksum, source identity, retrieval date and annual
ruleset edition `rules-au-income-tax/1.0.1`. Task MCR-002 below also corrects the
zero-income boundary discovered during the authorised adad qualification.
Positive-income tax amounts, LITO, PAYG and take-home rules stay unchanged.
Family reductions, SAPTO, exemptions, surcharge, student
loans, other years and a full tax-return assessment are outside this correction.

Only this source/test/doc correction, commits and a draft PR are authorised in
TaxKit. No TaxKit merge, publication, provider apply or deployment follows from
this decision. Adad qualification and deployment are separate consumer work.
Preserve the earlier source discrepancy receipt and unrelated rebuild work.

## Accepted task MCR-001

Implement the table/source/edition change, update affected retained assertions,
and add independently calculated values below, at and above both legal limits.
At $30,000, Medicare becomes $198.90 and annual liability $1,386.90. At $80,000,
Medicare remains $1,600 and liability $16,388. At $35,013 the shade-in levy is
$700.20; above the limit, $35,014 gives $700.28. Parameter tests assert year,
limits, rates and source; trace tests assert the changed source. These direct
oracles reject a version-only or compatibility-only false success.

Keep canonical Schemas, checked money, immutable parameter Layers and lazy
Effect programs. No new runner, SDK, copied DTO or host admission. A reused, owner-scoped
historical-byte comparison in the SDK fixture is justified by the two report
and metadata comparison callers.
The reused historical comparison in the packed consumer admits only complete
Medicare-owned fragments and the named annual report edition and $90k Medicare
trace. Keep original response digest arrays and prove unrelated changed
dates, amounts and versions still fail. The evidence owner is `docs/documentation-audit/medicare-2025-26-correction.json`.
Task status: in progress; acceptance requires focused tests/types, lint,
formatting, build, documentation, full local verification, SDK packed/downstream
checks for the changed literal, and one fresh independent review.

## Impact and proof

### Accepted task MCR-002: include zero in the nil-rate band

The independent adad consumer rejected zero income because bracket selection
required income to be strictly greater than the bracket's lower limit. Include
exactly zero in the existing zero-rate band; retain selection and traces for
every positive income. The Income Tax Rates Act 1986, section 3 and Schedule 7,
sets the resident tax-free threshold at $18,200. Prove the failure before the
change and success after it for $0, one cent and $18,200. Preserve all existing
positive-income assertions and the rule's declared nearest-cent calculation.
This is a small prerequisite bug fix under the authorised annual delivery goal,
not a change to the Medicare formula or a claim of complete tax-return accuracy.
Task status: in progress; acceptance requires the annual test suite, independent
consumer boundary checks, full local checks and fresh independent review.

| Surface | Decision and proof |
| --- | --- |
| Parameter source, annual report edition and tests | Change required: owning annual package; direct parameter, result, trace and boundary tests. |
| API/SDK expectations and OpenAPI snapshot | Change required: annual edition assertions and two approved direct Medicare fingerprints plus the bounded historical response comparison; HTTP tests, snapshot generator and packed/downstream consumer proof. |
| Package README and calculator architecture | Change required: correction, supported case and new edition; `bun run check:docs`. |
| SPEC, task and active plan | Change required: this accepted task and decision pointer; retain earlier failed/pending observations as history. |
| Release note | Change required: package Changeset for the corrected annual rules, affected public literal and public docs; `apps/api/CHANGELOG.md` Unreleased note. |
| Income-tax/LITO/PAYG/take-home rules and manifests/lock | Change required only for the exact zero-income bracket admission in MCR-002. Preserve positive-income results, other algorithms, manifests and lock; no dependency upgrade. |
| Public MDX/content and generated catalogue | Change required: four current annual/agent guides remove the pending-correction claims, explain the 1.0.1 scope and retain tax-return/deployment limits. Preserve example amounts and earlier acceptance records; bind newly reviewed source hashes and run `bun run docs:catalogue` and `bun run docs:validate`. |
| CI, tooling, skills, telemetry and infrastructure | Preserve: no policy or operation changes; repository verification still applies. |
| Provider state and credentials | N/A: no provider operation. |

Use the package's documented `check-types` and `test`, then root
`format:check`, `lint`, `check:docs`, `check:runbooks`, `check-types`, `test`,
`build`, `verification`, `sdk:check-packed-artifact` and `sdk:validate-downstream`.
The existing HTTP `test:openapi` owns snapshot generation. Record exact revision,
Bun/dependency/skill identities, command outcomes, source fingerprint, limitations
and review in the receipt. Revert only this correction to its parent for local
recovery; no deployed state is changed. A passing local receipt does not prove
adad compatibility or public enablement.
