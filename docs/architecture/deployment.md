---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-10-08
review_trigger: native app, retained recovery, provider resource, state, domain or rollback change
---

# Deployment

This owner describes current resource boundaries. Repeatable inspection and
recovery steps belong to the [deployment runbook](../runbooks/docs-deployment.md).
Current implementation and provider work belong to the active clean-slate plan.
Local declaration, build and browser checks establish no hosted availability.

## Native application shape

`apps/api` retains its standalone Bun HTTP server and exposes a native Worker
composition through `api/worker`. HTTP and private RPC reach the same checked
calculator and content service operations. `apps/web` is the native TanStack
Website for calculators and accepted documentation. Its server calls the API
through the actual private `TAXKIT_API` binding; browser RPC uses the checked
public API origin. There is no Website calculation or authored-content fallback.

`alchemy.apps.run.ts` selects the separate `TaxKitAppsCloudflare` candidate
with `TaxKitApi` and `TaxKitWebsite`. Private `@taxkit/infrastructure/apps-stack`
owns that resource declaration. Each host gets its own address from native
`Worker.URL` and its peer address from the peer's Output. Missing addresses
remain null during declaration and become checked runtime configuration errors,
not guessed URLs. Native Stack secrets select the checked stage's Doppler
configuration and reject `--env-file`. The same composition adds non-secret
rate namespaces: `10078` for Production and `10078` followed by the checked PR
number for Preview. Those values override Doppler namespace values while shell
app values remain disabled. Before apply, read available Worker bindings and
refuse collisions with foreign namespaces; declaration is not reservation.

The installed beta.80 planner patch fixes circular property resolution before
walking fresh API/Website Outputs. It preserves cycle rejection when an early
resource cannot be created. Native tests use memory state and an explicit mock
provider to qualify create/no-change/update and secret selection. That proof
is separate from real Cloudflare diff, apply, adoption, teardown or rollback.

`alchemy.apps.local.run.ts` uses the same native graph with disposable local
state and rejects operations other than the exact owned development stages.
Root `bun run dev` supplies the empty owned env file and an isolated Alchemy
home. Native resources own origins, bindings, Worker/Vite lifetimes and source
reload. The [Website guide](../../apps/web/README.md) owns setup and actual local
CLI/browser checks. Local state and local Worker proof are not cloud state.

## Retained analytics project candidate

`alchemy.posthog.run.ts` composes the private infrastructure `./posthog`
export. `TaxKitPostHog/prod` owns one stable retained `TaxKitProject` identity,
shared by Production and deliberate controlled Previews. Local and PR stages
refuse project declaration. The project uses the fixed US service and checked organisation
configuration; names never prove ownership. Every paged project identity is
read before a creation decision because the current Distilled list omits the
marker. Incomplete, forbidden or ambiguous inventory is an error, not absence.

The native Provider owns lifecycle; the private Distilled Layer owns API calls
and redacted management credentials. Expected configuration failures are
deferred into native lifecycle error channels, with one cached management Layer
under the stack's scope, because beta.80 requires error-free provider
registration. No independent provider-write script exists. Failed create
recovery performs checked reads, with no automatic second POST. Updates
preserve provider IDs and capture keys. Missing retained state or changed
account/region/marker refuses replacement. Ordinary removal retains
provider projects; the bulk-delete scan skips them.

The [infrastructure guide](../../packages/infrastructure/README.md#retained-posthog-project-candidate)
owns detailed bounds and local proof. This candidate establishes no management
credential, project entitlement, cloud plan, apply or stored-event proof. The
app graph has no analytics project reference and remains off by default.
Browser design and provider activation remain T008 work; metrics remain deferred.
Each enabled event carries its application and exact stage. Production reports
filter `stage=prod`; controlled Preview proof filters the exact `pr-N`. This
separates reports within one project and does not create an access boundary.

## Retired old documentation operation

`apps/docs` is no longer a workspace. Its README is a tombstone. The
[retention manifest](../documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json)
keeps all 49 original sources, exact hashes, useful page addresses, original
workflow/command controls and dated provider recovery records addressable.
The JSON source bundle is inspection data, not a complete build/deploy checkout.
Ignored local build, dependency and state files stay physically untouched.

The old `TaxKitDocsCloudflare/DocsWebsite` graph is not redirected to the new
resources. Its root entry exports a typed static retirement marker. The actual
Alchemy importer rejects it before session providers, remote state and planning;
startup can still create local logs and an empty profile. It never returns a
successful empty plan. Old writer/browser workflows are manual permission-free
stops with no checkout, credential fetch, provider step or automatic teardown.
The original source controls remain independently inspected as history.
The read-only historical receipt reconciler remains available.

Original `pr-N`, `prod`, account, resource, state, version, URL and rollback
identities remain attached to their dated receipts. Local source retirement
neither changes those provider resources nor grants recovery authority. Old
Doppler/GitHub environment approvals cannot transfer to the native graph.
A hosted old-resource recovery needs its complete accepted source/artifact
context and a separately approved operation under the runbook.

## Current proof and remaining operation work

The native pair check freshly builds both apps and observes actual Worker,
private API and Chromium behaviour. The Website preserves authored page URLs,
with `/` deliberately becoming the calculator entry and `/start` the docs entry.
Native declaration and runtime checks do not establish hosted replacement
availability, domains or a provider rollback.

T007 owns the native procedure in the deployment runbook and its exact-candidate
plan/readback preparation. The dated cloud and agent guide receipts record
authorised Preview/Production delivery. DEV-81 retains final overall delivery
acceptance, future operations and separately qualified rollback; those dated
operations grant no standing authority.
Metrics remain deferred by Cooper. Both native resources explicitly disable
platform invocation logs, stored logs and traces; later collection needs its
own accepted approach and privacy proof.

## Related owners

- [Package ownership](package-ownership.md)
- [Configuration](configuration.md)
- [Testing and quality](testing-and-quality.md)
- [Dated deployment evidence](../evidence/deployments/README.md)


## Production-only domain candidate

The native `prod` graph declares an adopted retained `taxkit.dev` zone and
retained DNS settings matching the independent 7 October readback. It declares
`taxkit.dev` for the Website, a native `www.taxkit.dev` redirect, and
`api.taxkit.dev` for the API. Domain zone IDs come from the declared zone's
Output. Self origins still use `Worker.URL`; peer origins still use resource
Outputs and checked application Config. Local and `pr-N` graphs omit domain
properties and both Production resources; they do not request domain removal.

The [dated provider readback](../documentation-audit/clean-slate-foundation/2026-10-07-domain-provider-readback.json)
records existing state, not desired availability. DNSSEC, registrar lock,
automatic renewal, TLS settings, SOA and unrelated records are not changed by
this declaration. The focused native graph uses memory state, mocked reads and
refused writes. The installed Alchemy beta.80 redirect provider originally treated every failed
shared-rule read as an empty ruleset. Actual mocked-provider calls reproduced
that behaviour. The receiving source and compiled provider are now patched to
accept only native `RulesetNotFound` as absence: a 403 refuses rule replacement,
a specific missing-rule reply permits creation, and existing unrelated rules
survive. The three regular provider tests and six source/compiled probes pass.
The provider uploads its Worker script before reading shared redirect rules;
this correction does not roll that earlier upload back after a read failure.

The version-three plan projection in `tools/docs-deployment` admits the native
API/Website resources, checked bindings and summary. Its Production variant
also admits the retained settings and adopted zone; zone creation, replacement,
delete, unknown rows and Production resources in Preview refuse. It requires
the exact configured account and Production zone. The existing projection
command now checks a clean candidate and unchanged tracked source bytes,
calculates configuration/input/lockfile/patch hashes, and writes a separate
native source identity. Optional supplied hashes must agree. The manifest
covers the named source paths; generated/dependency bytes, environment and
provider state remain outside it. Installed beta.80 version and caller-supplied
plan shape do not prove installed patch equality or the plan's origin.
Historical version-one/two receipts keep their original bytes and resource
identities, and historical writer commands/workflows still refuse. Native
source identities, existing authenticated state, credential selection, live
plans and provider/public readback are recorded in the
[cloud delivery receipt](../documentation-audit/clean-slate-foundation/2026-10-07-native-cloud-preparation.json),
[agent guide delivery receipt](../documentation-audit/clean-slate-foundation/2026-10-07-agent-setup-and-cancellation-bounds.json)
and [operational handover receipt](../documentation-audit/clean-slate-foundation/2026-10-07-native-operation-handover.json).
Declaration and fixture checks alone prove no cloud operation. The deployment
tool README and runbook own source coverage, current native commands and partial
local-write recovery. An empty post-apply plan and an executed cloud rollback
remain separate, unqualified claims.
