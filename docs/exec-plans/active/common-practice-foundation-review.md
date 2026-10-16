---
document_type: execution-plan
lifecycle: current
authority: supporting
owner: taxkit-architecture-owner
last_reviewed: 2026-10-13
review_trigger: agreed direction, implementation scope or Common Practice approach changes
---

# Common Practice foundation implementation plan

The [proposal](../../product-specs/common-practice-foundation-review.md) records
the source comparison and Cooper's direction: Common Practice's app/client and
ordinary operational approach, Cloudflare first, patch-free Alchemy, supported
Bun host, and safe operational details only.

## Progress (13 October 2026)

Orders 1 to 5 are implemented on branch
`claude/taxkit-native-effect-alchemy-f44f82`:

- Receipt, approval, custody and epoch tooling is retired; ordinary checks and
  native Alchemy/Doppler commands replace it.
- The one-way unpatched Website/API graph uses Effect 4.0.2 and Alchemy
  2.0.0-beta.81 with no patches. Native www redirects remain; the failed
  ruleset-read limit is recorded in the infrastructure tests.
- The API serves discovery, the trusted HTTP calculation and one public cache
  decision; HTTP and RPC share the public credential-free browser policy on
  both hosts; MCP lists only `https://taxkit.dev`.
- The Website uses native generated clients (private binding on the server,
  `AtomHttpApi.Service` in the browser) with one registry; server functions,
  the Website RPC path and request atoms are gone.
- Q5 helpers are replaced by `HttpApiClient`; scenario, content, Fumadocs,
  MCP and RPC client Layers are static.
- The 0.7.1 policy is vendored with native ownership rules and fixtures.
- Bun's calculation pool was already application-wide: `HttpRouter.provideRequest`
  builds its Layer once.

Failed server page loads reply 500 with `no-store`: TanStack's error handling
replaces the 503 the loader sets. Safe operational fields follow below.

## Delivery (13 October 2026)

Main `4cb91fb8` (PRs 173 and 174) was deployed locally with native Alchemy and
Doppler: Preview `pr-173`, then Production at 04:32Z. The Production plan left
the zone and DNS settings unchanged. Public checks on `taxkit.dev` and
`api.taxkit.dev`: www keeps path and query on a 301; public reads HIT after
their first request; HTML and Markdown at one docs URL HIT in both orders
(`Vary: Accept`); an unrelated cookie shares HTML; API `Origin` variants HIT in
both orders; calculations, errors and health are `no-store`; any HTTPS origin
gets credential-free CORS; MCP admits only `https://taxkit.dev` and Origin-less
clients; the no-JavaScript form and the browser both return $1,301.00 for
$1,654 weekly; browser docs navigation calls the API directly. A Preview
content-only change reached the API JSON, HTML and Markdown and was restored;
`pr-173` was then destroyed.

Roll back by redeploying `f2191048` with that revision's own commands.

Known limits:

- Production `alchemy drift` reports both Workers as changed straight after a
  clean deploy, while `production:plan` shows no changes and Preview shows no
  drift; the report does not name the fields. Nothing was repaired.
- Linting `apps/web/test/native-pair.boundary.test.ts` alone takes about 100
  seconds under the vendored policy.
- The Website memo needed explicit excludes (PR 174); without them a deploy
  hashed about 1.2 million linked package files and ran out of memory.

Completed research covers the full Website/HTTP/RPC/MCP/SDK call paths, current
Common Practice workflows and native secrets, upstream Effect/Alchemy support,
package/export differences, and the tools that enforce TaxKit's extra ceremony.
The updated strict Effect review uses published/installed Commonplace 0.7.1
and Common Practice main `6dc08581d1ad79b06853fe3721a5e6124d2989a1`. Native
HTTP/Atom clients replace the earlier proposed Website RPC/client replicas.
Static host Layers, selected-key Config, complete-call bounds, safe error
reporting and useful lint remain. Q6 now chooses public browser access and
Production publication links; Q8 chooses native MCP with listed browser origins;
Q9 chooses one-minute public loader freshness. Q7 agrees seven-day Cloudflare freshness
for eligible public documentation and fixed metadata. Existing tax, HTTP/RPC/MCP
and SDK contracts remain; no provider or dependency change follows from research.

The new audit packet has been removed and its useful findings folded into the
proposal. No implementation acceptance crosswalk or new receipt is required.

## Safe operational fields (13 October 2026)

The Later item is implemented on branch `claude/taxkit-observability`, not yet
deployed. Following Common Practice, production-only `TaxKitObservability`
(`alchemy.axiom.run.ts`) and `TaxKitTraceExport` (`alchemy.trace.run.ts`)
stacks own a retained ingest-only token, four retained dashboards and retained
`taxkit-axiom-logs`/`taxkit-axiom-traces` destinations over Site's shared
datasets. Each host writes one fixed `taxkit.request` record per request
(service, closed route family, method, outcome, status, response-ready time).
Production Workers export console logs only; invocation logs and automatic
traces stay off because they carry URLs and caller details, so the trace
destination is unattached. Other stages export nothing.

Memory graph and privacy tests cover the stacks, Worker settings and record
fields. Not yet done: the reviewed `axiom:deploy`, `trace:deploy` and
Production release, stored-row privacy checks and dashboard rendering. The
[runbook](../../runbooks/deployment.md#observability) has the order and checks.

## Implementation order

| Order | Work | Meaningful check |
| --- | --- | --- |
| 1 | Replace receipt/approval/custody/epoch tooling and instructions with normal commits, checks, native Alchemy and Doppler. Wire current Cloudflare preview/production workflows. | Commands select the intended stage; forks receive no secrets; preview deploy/cleanup cannot overlap; ordinary checks run without old receipt files. |
| 2 | Apply Q6's one-way native address graph and Production publication links. Keep native domain.redirects and delete the proposed Worker/ASSETS redirect workaround. Remove all Alchemy patches and align the chosen published graph. Use Q8's native MCP list and isolated local state. | Frozen unpatched install; native planning/startup, public CORS and trusted caller policy, stage pairing, correct publication/API links, redirect/path/query semantics and known shared-ruleset limitations. |
| 3 | Use existing native HttpApi contracts, static host Layers and selected-key Config. Replace Q5 helpers with direct generated clients and update examples. Keep final calculation policies; extend trusted private admission to the HTTP calculation POST. Move Cloudflare header interpretation to hosts and correct native safe reporting. | Calculator-specific inputs, returned ID/report-kind, caller key outside JSON, complete ten-second/two-MiB response bounds, native declared HTTP statuses/errors, five-second body/work limits and no-JavaScript form. |
| 3a | Native SSR HttpApiClient over the private binding; native browser AtomHttpApi.Service with browserRuntime.factory and one router/React registry. Loader-only reads call generated methods directly through one bridge. Remove server functions, copied method services, loader request atoms/caches and Website-only result envelopes. Add native API discovery GET/HEAD handlers and forward finished responses once. | Full first HTML/metadata, native serialisation/recovery, current navigation/preload policy, idle configuration, actual browser CORS, cancellation/replay/final disposal, preserved Markdown/discovery and machine RPC clients. |
| 3b | Enable native version-scoped caching on both Workers and apply agreed seven-day headers only to public successes. Replace obsolete public restrictions; keep personal/error/cookie exclusions. Include content in both build inputs and deploy the stage pair together when authorised. | Repeated consumed public requests show HIT/Age; checked variants work in both orders; private/error replies remain uncached; a Preview content-only change refreshes both JSON and HTML. Native activation is not atomic. |
| 4 | Vendor published 0.7.1 portable policy unchanged with provenance, real owner paths and useful TaxKit extensions. Enable native loader/client/cache/proxy ownership checks; checked-page-response only with an existing complete helper. Make imports aware of nested manifests and run actual Effect diagnostics. | Actual Oxlint accepts native clients, component queries, config/service atoms and cache declarations; rejects loader request state, replica services, global Cache API wrappers and Website data proxies. Aliases, neighbouring files and nested paths are covered. |
| 5 | Fix Bun application-wide calculation pool using the same host-neutral services. Keep current HTTP coverage. | Overlapping requests share eight places; five-second work limit and existing HTTP behaviour remain. |
| Later (implemented, not deployed) | Introduce fixed safe operational fields through native Axiom/Cloudflare resources using the agreed existing datasets. | No salaries/facts/results/traces, raw URLs/bodies/errors or unsafe native channel exports. Stored Production rows checked after release. |

Keep each code change coherent and reversible with Git. Use focused tests for
its actual behaviour and one ordinary verification command. Public package
contract changes use normal Changesets and actual packed/downstream checks.
The local native Website/API pair suite (`bun run test:native`) passes on the
new graph; hosted behaviour still needs its own Preview and Production checks.

Cooper agreed on 10 October 2026 to replace public raw-client/Layer-factory HTTP
helpers, with callers/examples updated together and no temporary compatibility
path. Q6 now chooses public browser HTTP/RPC access and Production publication
links. Keep the API's own stage address in machine endpoint entries, and each
host's native self URL. API discovery stays API-owned; remove reverse Website
Output/binding workarounds. Q8 uses the native MCP exact-origin list, initially
Production TaxKit plus Origin-less clients, with no Effect predicate patch.
Keep the Website's native `websiteOrigin` distinct from checked
`publicationOrigin`: update content/API/Website settings and metadata/Markdown
link owners together. Preview tools, relative navigation and form actions must
keep using the actual stage.

The native HTTP loading pattern uses the explicitly chosen Q6 policy.
Keep one server runner, one browser runtime factory and one registry shared by
router/React. Native service acquisition retains the client/configuration;
TanStack owns loader results/freshness. Components may own native reactive
queries. Preserve existing machine RPC JSON framing and request-owned lifetime;
no NDJSON migration or RPC removal is required for Website HTTP calls. Q9
uses one-minute built-in loader freshness for public data, with personal results
and live local configuration excluded.

Q7 is agreed on 13 October. Eligible public successes use browser rechecking
and seven-day Cloudflare freshness with native version isolation. Stricter
private/no-store headers still protect personal results, failures and cookies;
public five-minute limits can be deliberately replaced. A Cloudflare-specific
public header must never override a private response. Keep one small policy,
not a general cache framework or new receipts.

Retain native www redirects; the stronger failed-ruleset-read guarantee belonged
to the removed patch, not ordinary native planning. Document that upstream limit
and keep public redirect tests. Preserve the legacy MCP host's early setup-quota
protection until native admission can run before allocation. Neither needs a
new provider/client framework.

Static Layers also change exported scenario helper signatures. Use normal
Changesets and update callers together, preserving the checked tax inputs and
results. There is no silent factory allowance in the new shared rule.

Update current architecture, runbooks, root instructions, skill routing and the
older clean-slate plan as their implementation changes. History stops being an
executable prerequisite. Do not create a replacement receipt system under a
new name. Redeploy a previous working revision for operational rollback through
the same native workflow.
