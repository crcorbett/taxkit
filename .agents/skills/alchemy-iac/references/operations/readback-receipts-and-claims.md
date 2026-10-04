# Readback, Receipts, and Claims

## Contents

- [Independent readback](#independent-readback)
- [Claim ladder](#claim-ladder)
- [Receipt schema](#receipt-schema)
- [Secret-negative receipt policy](#secret-negative-receipt-policy)
- [Exact readback](#exact-readback)
- [Contradictions](#contradictions)
- [Retention of receipts](#retention-of-receipts)

## Independent readback

Readback must use a provider API, CLI, or query path independent of Alchemy state. It should answer the exact claim.

Examples:

- Cloudflare: Worker/version, route, binding, storage, destination.
- Axiom: dataset/dashboard inventory and a bounded query.
- WorkOS: application/environment and redirect inventory.
- Vercel: project/Git connection/deployment/revision/environment metadata.

Readback through the same cached object returned by reconcile is not independent.
A saved-state noop row does not prove a live binding. Check the exact Worker
version and stage: a provider endpoint for the parent Website may return parent
settings rather than its Preview version. Record a readback limitation instead
of treating parent metadata as independent Preview proof. A no-change desired
plan and a drift report are separate observations; inspect differing managed
fields before classifying either as correct.

## Claim ladder

Name the strongest proven claim:

| Evidence               | Valid claim                          | Invalid shortcut                |
| ---------------------- | ------------------------------------ | ------------------------------- |
| source diff/typecheck  | desired code is valid locally        | deployed                        |
| Alchemy plan           | classified intended change           | authorised/applied              |
| green apply job        | workflow completed                   | provider is correct             |
| Alchemy state          | state records resource               | provider resource exists        |
| provider API           | provider reports exact configuration | public behaviour works          |
| exporter HTTP response | collector accepted transport         | signal is queryable             |
| public HTTP 200        | endpoint responded                   | correct revision/config/journey |
| full journey           | observed bounded behaviour           | all provider cleanup succeeded  |

Report lower layers when higher proof is unavailable.

## Receipt schema

Encode receipts from a Schema. Recommended top-level fields:

- schema version;
- operation;
- result class;
- timestamp and bounded duration;
- stack/stage/environment;
- source repository/ref/revision;
- workflow/run safe identity;
- provider scopes and safe IDs;
- plan summary by change class;
- apply summary;
- independent readback summary;
- journey summary;
- teardown/residue summary;
- checks;
- non-claims;
- recovery instructions;
- sanitisation statement.

Use portable identifiers. Do not embed absolute workstation or CI runner paths.

## Safe diagnostics before display

Select only named safe fields before printing a state/provider diagnostic.
Never dump whole Alchemy state, an arbitrary Cause or a raw failure payload,
even when values are normally Redacted. Failure formatting may expose the
underlying secret. Sanitise before display, not only when saving the receipt.
Test successful and failing diagnostic paths with a fake secret marker.

If a credential is exposed, keep the incident outside shared plugin files.
Replacement needs authority for that exact credential and its existing grants.
Verify replacement delivery before deliberate old-credential revocation; do
not broaden permissions merely because the usual management credential lacks
rotation capability.

## Secret-negative receipt policy

Reject receipts containing:

- token/key/secret values;
- Authorization/Cookie headers;
- environment variable values;
- state payloads;
- raw provider request/response bodies;
- unbounded logs;
- personal/user payloads;
- arbitrary Causes or stack traces;
- local absolute paths.

Allow:

- credential class;
- issuer/subject safe metadata where policy permits;
- provider safe IDs;
- bounded counts;
- hashes/digests that cannot recover a secret;
- sanitised error tags.

Test the encoded receipt with secret-marker and absolute-path scans.

## Exact readback

Prefer semantic checks over raw JSON snapshots:

- identity equals expected;
- managed field equals desired;
- provider ID is stable;
- source revision equals requested;
- route/binding points to expected resource;
- query contains proof identity in the expected time window;
- deleted resource is absent.

Canonicalise provider order where order is not semantic. Preserve order where it affects behaviour.

## Contradictions

Fail closed when evidence conflicts:

- expected resource URL returns 200 but provider inventory is empty;
- state says resource exists but provider says missing;
- provider deployment is ready but source revision differs;
- dashboard exists but queries retired datasets;
- proof query returns events from a different stage;
- destroy reports success but readback still finds residue.

Record the contradiction and smallest next diagnostic. Do not average conflicting evidence into a partial success.

## Retention of receipts

Keep immutable operation receipts separate from current architecture/runbooks. A receipt records what was proved at a point in time; it does not become current truth forever.

Regenerate only the owning current receipt. Never synthesise historical evidence or edit an old receipt to match new code.
