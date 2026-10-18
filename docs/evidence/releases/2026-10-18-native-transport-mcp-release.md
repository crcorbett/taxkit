---
document_type: release-evidence
lifecycle: evidence
authority: supporting
owner: repository-maintainers
last_reviewed: 2026-10-18
---

# Native transport and MCP release — 18 October 2026

The maintainer authorized findings 12–21, native Website HTTP forwarding,
modern-only Effect/Alchemy MCP and permanent deletion of the legacy session
namespace, followed by Preview, merge and local Production delivery. This
records the observed delivery, not current provider state. Published Development
Workflows 0.12.0 guided implementation and independent correction reviews.

## Source and verification

[PR #185](https://github.com/crcorbett/taxkit/pull/185) merged as
`dbe3e54c87c9970a3192fb8d85def89d4b39f142`.
[PR #186](https://github.com/crcorbett/taxkit/pull/186) corrected browser-cold
Preview cleanup and merged as `57a579d9f0834c767342239619e840e6ea8a0882`
at 02:56:04 UTC. The latter is the Production source; this later documentation
commit is not claimed as deployed application code. Effect is 4.0.4 and Alchemy
is unpatched 2.0.0-beta.81.

[Source Checks 39089035970](https://github.com/crcorbett/taxkit/actions/runs/39089035970)
and [cleanup Checks 39091335838](https://github.com/crcorbett/taxkit/actions/runs/39091335838)
passed. Pre-merge source proof separately passed the 47-file packed SDK check,
fresh native downstream consumer, API smoke, docs validation and Changeset
status. Four interrupted dependency-fetch attempts were preserved before cache
warming and the final native consumer pass; they were not successful checks.

A clean exact `57a579d` checkout passed frozen installation and full verification:
564 tooling, 1,157 package/application, 52 browser and 23 native tests across
11 native files, plus build, formatting, lint, types, Effect diagnostics, both
Knip graphs, 185-document and 1,574-path checks. The native phase took 194.39s.
Earlier exact `dbe3e54` verification is separate from this final-source gate.

The Effect 4.0.4 retained `layerHttp` negative control captured the exact native
AsyncLocalStorage exception three times. Byte-identical source restoration and
a native rebuild passed all three modern MCP tests. Its initial startup result
remains inconclusive. Independent reviews found no unresolved P1/P2 after
corrections to HTTP redirect scope, MDX expression/attribute/ESM classification,
role grants and complete-request native resume assertions.

The implementation retains two native Workers and public machine RPC, with one
shared calculation service/rate/work policy. Native request-scoped MCP supports
only `2026-07-28`; six tools remain, without sessions or list-change subscriptions.
Website server calculation POSTs use generated native HTTP over the binding and
stage-owned secret forwarding. Public/browser callers remain credential-free.
Findings 14–21 also correct page correlation, checked-source publication,
cleanup/gates, optional navigation metadata, manifest/role enforcement and MDX.

## Preview and cleanup

Preview source `737ffcdd0fbfab02f15b3851c3c8dcc56ede995e` passed all twelve
journeys in its corrected complete run. Its application code is unchanged in
the final source; PR #186 changes only workflow/test/owner documentation.
Provider binding readback and a fresh no-op plan confirmed these 100% versions:

| Host | Active Preview version |
| --- | --- |
| API | `e1a9c75c-ed00-415a-affd-77ea40c5d935` |
| Website | `f528151d-57b4-4204-b59f-6a56b6adbc16` |

Initial harness failures and bounded diagnostics were preserved. Hydration waits
observe existing React handlers, without changing HTML or adding product markers.
Foreign browser MCP refusal requires actual CDP evidence of denied preflight or
an on-wire POST 403 without ACAO, rather than a generic fetch error.

The PR #185 close job exposed missing Chromium during Mermaid catalogue
compilation. Its earlier cold proof had inherited the workstation browser cache.
PR #186 retains closed-PR/stage guards, then provisions the native browser and
system libraries before the catalogue build. Candidate `72b50e8` independently
proved the empty-browser failure and corrected 62-page build/source-stack import,
with 4,386 checkout-local dependency links and fetch forbidden during import.
Turbo/PATH/network-routing mistakes remained separate harness failures; local
OS libraries limited that local proof.

[PR #186 cleanup run 39091832469](https://github.com/crcorbett/taxkit/actions/runs/39091832469)
installed Chromium on fresh Ubuntu and built 62 pages at 02:57:06.986 UTC, then
stopped at 02:57:09 solely because Doppler credentials were missing. Both source
PR Preview jobs likewise passed verification then failed authenticated planning
with an empty GitHub `DOPPLER_TOKEN`. Local `prd`, `stg_preview`, `dev` and `ci`
tokens were valid; no GitHub secret was changed and no CI provider destroy is claimed.

After Production and stage-key comparison, native local destroy of `pr-185`
completed all three resources around 03:14:13 UTC. The first default Cancel
selection declined without mutation; an explicit native selection confirmed
the completed run. Independent readback at 03:14:28.018305 UTC found both Worker
settings returning 404, no native resource records or Random, and zero owned
namespaces.

## Production operation

Native Alchemy used the existing Doppler `taxkit/prd` source. Ordered plans at
03:07:32/03:07:37 UTC showed no Axiom/TraceExport changes. The Apps plan at
03:07:42 showed one Random creation, two Worker updates and four bindings;
nine zone/DNS resources remained no-ops. Hosted state v7/account and unchanged
old versions were verified before apply. Apply exited zero, completed 3/3 at
03:09:21 UTC, within the captured 03:08:30–03:09:48 window.

| Host | Active version (100%) | Deployment |
| --- | --- | --- |
| API | `cb81f5cd-d077-4e6c-a0fc-3e3d1beaf00a` | `842bc456-ecd8-4547-b08b-05358d7ab318` |
| Website | `0032f4a3-fdbf-4e28-8e3f-6ae5fc6cf7e0` | `1280de73-4ecc-4fda-8b43-34380d856728` |

Provider deployment times were 03:08:55.322158 and 03:09:17.985978 UTC respectively.
The previous API/Website versions were `8c70f896-fbc3-443c-a005-6a23697c6065` and
`0d11ba05-e544-4b8b-b828-de9df9d3d7dc`. Source identity follows the clean exact
checkout → native plan/apply → changed active versions/timestamps → independent
readback → fresh no-op plan chain; the provider does not embed the supplied Git SHA.
The fresh Production plan at 03:09:58 reported no changes.

Readback found 12 native records, a native Redacted 64-hex-character Random and
both secret-text bindings. Production and `pr-185` keys differed. The Website's
default-entrypoint binding targeted the exact API; only the API had the unchanged
60/60 limiter namespace `10078`. The approved legacy namespace
`c5b3d3afb20b40e48a345c9aecb068c5` was deleted, with other account namespaces
preserved and no legacy/previous-key binding. Deletion is permanent: older code
cannot recover its data or former sessions.

After Preview cleanup, independent readback confirmed the same Production
versions at 100%, 12 records, private/rate bindings and approved namespace absence.

Informational drift reported four fields: both Workers' saved `domain.zone`
absent from readback, DNSSEC pending→active, and the Zone modification date.
No repair was performed; the fresh plan was clean. Both Workers retained
`taxkit-axiom-logs` export at sample rate 1, with log persistence/invocation logs
and traces disabled and no Axiom service binding. Ingestion was not inspected.

## Public proof and limits

Production's twelve-check complete run exited zero at 03:10:40.898 UTC. It covered
all six official MCP tools with owning Schema/HTTP equality, originless and
permitted-browser access, legacy/foreign refusal, $1,654 weekly → $1,301 net and
$353 PAYG with JavaScript enabled/disabled, direct docs HTTP/Markdown, three SSR
calculator links, public cache HIT/Age, and private/error no-store responses.
Eight supplemental checks also passed, including www 301 path/query preservation
and public discovery. The first supplement probed the incorrect `/docs/quickstart`
and received 404; source confirmed `/start/quickstart` and one corrected fresh
run passed. The original probe error remains preserved, not a product failure.

HTML was untouched. Two browser contexts blocked only the exact Cloudflare
platform script `https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092`.
This is not full platform-script execution or analytics proof.

A separate normal browser run used no routing, interception, blocking or HTML
rewrites. Its one hydrated calculation and actual search → Quickstart navigation
both passed through the direct API with owning Schema checks. The Cloudflare
script returned 200 and was parsed in both pages, with no page or console errors.
This closes the application-flow check with platform scripts enabled; it does
not establish analytics ingestion, storage or privacy.

Hosted quota exhaustion remains **inconclusive**: the bounded 80-call probe did
not establish correlated exhaustion. Separate Bun/native Chromium diagnostics
observed two egress identities per origin, all at MSP; raw IPs were never logged.
No further burst sought a green result. Native shared-identity/cross-format tests
and provider 60/60 readback establish narrower contracts, not exact global quota
or successful hosted exhaustion. Current/previous-key tests do not establish
hosted rotation. Aborting an outgoing HTTP request can leave remote work until
its existing budget; prompt remote interruption is not guaranteed.

No npm publication, hosted key rotation, telemetry ingestion or dashboard proof
is claimed. The Changeset remains pending. No rollback was needed or performed;
future recovery uses the native command and documented key-overlap ordering,
subject to irreversible namespace deletion. The
[completed plan](../../exec-plans/completed/common-practice-foundation-review.md)
retains history; the [deployment runbook](../../runbooks/deployment.md) owns future
operations. No credentials, raw identity headers or provider state are copied here.
