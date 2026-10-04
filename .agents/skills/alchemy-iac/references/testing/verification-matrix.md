# Verification Matrix

## Contents

- [Match evidence to risk](#match-evidence-to-risk)
- [Static tests](#static-tests)
- [Graph and memory tests](#graph-and-memory-tests)
- [Provider contract tests](#provider-contract-tests)
- [Provider-specific proof](#provider-specific-proof)
- [Receipt tests](#receipt-tests)
- [Reporting](#reporting)

## Match evidence to risk

| Layer             | What to test                                 | What it proves         | What it does not prove     |
| ----------------- | -------------------------------------------- | ---------------------- | -------------------------- |
| Static            | file owners, forbidden APIs, workflow policy | structure/policy       | runtime or provider        |
| Type/schema       | graph inputs/outputs, receipt codecs         | typed boundary         | live payload compatibility |
| Unit              | naming, stage guards, query predicates       | pure policy            | provider state             |
| Memory provider   | create/update/delete graph                   | provider algorithm     | live API                   |
| Plan              | exact change classification                  | intended diff          | apply/authority            |
| Isolated apply    | disposable resource lifecycle                | provider mutation path | Production                 |
| Provider readback | exact live fields                            | provider configuration | public behaviour           |
| Journey           | asset/auth/query/runtime flow                | observed behaviour     | complete cleanup           |
| Destroy/readback  | absence/residue                              | teardown result        | future provider drift      |

## Static tests

Assert:

- root entrypoints remain composition-only;
- no raw environment access below adapters;
- no raw provider clients exported;
- no credential-like fields in receipt Schemas;
- workflow has protected Production gates;
- dataset/dashboard catalogues include identity predicates;
- Production route/removal policy is explicit.

## Graph and memory tests

Use deterministic providers to capture:

- resource kinds and logical names;
- physical names;
- dependencies;
- inputs;
- removal policies;
- plan change classes;
- serial ordering;
- encoded outputs.

Run the same lifecycle more than once to prove convergence. Test create, no-op, update, replace classification, retain, delete, and already-missing.

## Provider contract tests

When authorised, use an isolated stage and least-privileged credentials. Validate actual provider payloads through the same Schemas as Production.

Test:

- create/read;
- update/read;
- timeout/read-before-retry;
- forbidden credential;
- provider payload drift;
- deletion/absence;
- retained resource isolation.

Do not run destructive provider tests against Production.

## Provider-specific proof

Cloudflare:

- Worker/deployment identity;
- route/binding/storage readback;
- asset-first/Worker-first route matrix;
- content type and cache behaviour.

Axiom:

- capacity preflight;
- dataset/dashboard inventory;
- token scope qualification;
- unique log/metric/trace query by identity and time window.

WorkOS:

- exact application/environment;
- redirect inventory;
- redirect/authentication journey;
- callback cleanup.

Vercel:

- project/team/Git identity;
- deployment source revision;
- environment/OIDC metadata;
- public application journey.

## Receipt tests

Decode and re-encode receipts. Assert:

- schema version;
- exact source/stage/provider safe identity;
- no secret marker;
- no absolute local/runner path;
- bounded arrays and strings;
- non-claims included;
- contradiction or residue cannot be represented as full success.

## Reporting

Report every verification layer as:

- passed;
- failed;
- blocked;
- skipped/not authorised.

Name the strongest claim the evidence supports. Never write “verified” without its object and environment.
