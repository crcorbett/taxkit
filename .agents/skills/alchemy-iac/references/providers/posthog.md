# PostHog resources with native Alchemy

Use this when adding PostHog to an Effect application or maintaining its projects,
dashboards, insights and dashboard tiles. Management and event collection have
different owners and credentials. Read the sibling
[application layout](../effect/posthog-analytics.md)
and [browser adapter](../../../effect-client-wrapper/references/posthog-browser.md)
for the runtime side. Apply the sibling
[strict Effect policy](../../../strict-effect-ts/SKILL.md) to the management
service, provider callbacks and tests as well as the application.

## Contents

- [Establish the intended collection](#establish-the-intended-collection)
- [Separate resource management from capture](#separate-resource-management-from-capture)
- [Declare durable resource ownership](#declare-durable-resource-ownership)
- [Connect deployment outputs to the applications](#connect-deployment-outputs-to-the-applications)
- [Prove each claim separately](#prove-each-claim-separately)
- [Primary sources](#primary-sources)

## Establish the intended collection

Agree the questions and selected events before declaring charts. Keep browser
page views, chosen actions, backend requests and completed domain operations
separate. A server request is not a visit, and retries are not new user actions.
Decide collection controls, identity, allowed properties, retention, environment
separation and accepted event loss. Explicit events with automatic capture and
recordings off are a useful starting point, not a universal product requirement.
Consent is an application decision; never infer its legal requirements from
the application's country or copy another application's choice.

Resolve the authorised account, organisation, project region and project limit.
Use the existing secret store. Choose management-key capabilities from the actual
operations: project/dashboard/insight management and query readback are distinct
from billing. Billing and spending limits remain separate unless deliberately
owned; inspect each product's limit instead of assuming one account-wide cap.
Stop an apply rejected by entitlement rather than retrying the same creates.

Inspect installed Alchemy, Effect and `@distilled.cloud/posthog` types and locked
upstream references. The source-derived pattern was qualified with Effect
`4.0.0-rc.117`, Alchemy `2.0.0-beta.79`, Distilled `1.0.0-rc.12` and browser SDK
`1.435.6`. This is a historical compatibility snapshot, not a current-version
recommendation. Verify it again for the target repository. Do not copy patches
or internal SDK endpoints without proving the installed contract.

## Separate resource management from capture

| Owner                                            | Work                               | Credential                                    |
| ------------------------------------------------ | ---------------------------------- | --------------------------------------------- |
| Native Alchemy stack and private Distilled Layer | Project/chart lifecycle            | Redacted management key, deployment only      |
| Checked runtime configuration                    | Matching project, region and stage | Public project token; omit management details |
| Browser Effect adapter                           | Selected browser events            | Matching public project token                 |
| Backend Effect HttpClient Layer                  | Checked event batches              | Matching public project token                 |

Distilled's management API is not the browser event SDK or a capture client.
Its operations already return Effect: do not wrap them in Promise adapters.
Keep raw operations, credentials and provider payloads inside
`management.adapter.layer.ts`. Public service operations take branded addresses
and return checked application-owned state. Decode results immediately; map
expected failures to safe named errors. Never let a raw provider response or
management key reach a Worker, root loader, browser bundle or error log.

The service exposes closed `Effect.Effect<Success, PostHogManagementError, never>`
operations implemented with named `Effect.fn`; acquisition failures stay in the
Layer error channel. Use Schema-backed Config and `Redacted` for credentials.
No raw client accessor, generic request/callback or primitive address strings.
Do not erase provider errors with `Effect.option` or `orDie`. Model only genuine
not-found as `Option.none()` and branch with `Option.match`. Expected errors
carry bounded safe codes/reasons, not raw responses, SDK errors or arbitrary
Causes. Distilled's typed transport still needs application boundary decoding.

## Declare durable resource ownership

Use native provider Resources if the installed Alchemy version supplies the
needed lifecycle. Otherwise implement small custom Resources and Providers for
projects, dashboards, insights and tiles. Follow
[custom resource semantics](custom-resources.md); native Alchemy CLI remains
the only plan/apply/destroy owner. Do not create a second provider-write script.

Keep checked definitions in schemas, a dashboard catalogue in its own owner,
the semantic management service separate from its live adapter, and lifecycle
providers separate from the root graph. Add further files only for real owners.
The root composes Layers, state, configuration and named resource declarations.
Resource definitions and stored outputs use Schema-derived branded identities
with actual format/range bounds; branding an unrestricted string is insufficient.
Declare known insight-query shapes and bounded catalogue values, not unchecked
JSON or a generic `unknown` query payload. Keep deployment and runtime error
vocabularies separate so provider-management details cannot leak into capture.
Use outputs for project-dependent charts and tiles so the graph orders them.

Normalise Alchemy's optional previous/output values to Option once inside each
provider callback and use `Option.match`; translate back only if the native
callback contract requires `undefined`. Preserve Alchemy's native Effect-returning
callback types instead of introducing a Promise runtime or unchecked cast.
For unresolved Outputs, follow the installed `Diff`/`Output` contract rather
than treating a deferred value as already decoded. A provider operation's
required host context is not an excuse to expose it on management methods.

Use stable logical resource IDs and exact ownership markers. A similar name,
the first search result or a project ID supplied by a foreign account does not
prove ownership. Read an owned candidate and verify organisation/project/marker
before mutation. Reject ambiguous matches. Do not automatically adopt a default
project. Ownership-field changes require an explicit replacement decision.

List Schemas must describe all valid list items, including unrelated unnamed
insights and dashboards. Decode nullable/absent names to `Option`, then use
`Option.match` to filter candidates. Apply stricter managed-name and ownership
checks only after selection. Follow every checked pagination page; a first-page
miss is not proof of absence. Check each page and bound traversal by total
operation time, item/page limits and repeated-cursor detection. A limit or broken
pagination is a named inventory failure, not absence that permits creation.
Do not fetch an unchecked next URL or forward credentials to another host.
Preserve unrelated tile memberships when updating
a chart. A tile is an association with its own identity, not a duplicate insight.

Read must distinguish missing, forbidden, invalid, transient and foreign data.
Do not turn every failure into absence. Bound deadlines and retries with Effect;
for an uncertain create, read by ownership before any further write. An automatic
retry of a non-idempotent create can duplicate projects or charts. Keep sensitive
provider bodies out of public failures and plan receipts.

Declare retention separately for each resource. Retaining a project preserves
its event history and does not prevent updating or removing owned dashboards,
insights and tiles. Use each API's actual soft-delete semantics and check the
deleted flag on readback. Reviving a soft-deleted object needs an update even
when desired fields are unchanged. Do not recreate a retained missing project
silently. Support the installed CLI's bulk-destroy path as well as ordinary
removal; test both against retained projects and foreign objects.

A display rename from test to preview should preserve the existing logical ID,
provider ID, capture token and ownership marker. Existing configuration markers
can remain `test` if their checked contract requires it. New projects may use
Preview naming from the start. Renaming is not permission to replace history.

## Connect deployment outputs to the applications

A dedicated analytics stack can own one production project and one shared
nonproduction project. It need not create a project for every ephemeral PR.
The application stack reads the matching project through native references and
outputs. Checked stage configuration selects production, deliberate Preview
collection or disabled collection; local and ordinary Preview collection should
follow the agreed policy. Reject cross-stage or cross-region combinations.

Encode the owning configuration Schema once for each explicit Worker binding.
Keep fallible validation/encoding in the typed provider or configuration owner
before publishing outputs. In beta.79, `Output.mapEffect` requires an Effect
whose error type is `never`; it cannot carry an expected codec/configuration
failure. Use it only for genuinely infallible work, or select an already checked,
encoded binding with pure `Output.map`. Do not add `orDie`, an assertion or an
Action solely to hide that type restriction. Check the installed contract again
for another Alchemy version. Qualify Alchemy's runtime
binding representation: native environment handling can parse JSON before an
application JSON-string codec sees it. In beta.79, a native packed Redacted
marker preserved the encoded string; other versions require their own readback
test. Redaction avoids accidental logs, but a browser project token remains
public by design. Never distribute the whole deployment environment.

## Prove each claim separately

- Deterministic provider tests: create, no-op, update, uncertain-write recovery,
  pagination, unnamed foreign items, ownership refusal, tile membership,
  soft deletion and retained project removal. Include malformed responses,
  permission refusal, incomplete/cyclic pagination, redacted errors, deadlines,
  interrupted operations and cleanup. Typecheck live/test Layers against the
  same closed contract; use native Effect test transport and `@effect/vitest`.
- Native plan: exact revision/stage, expected create/update/remove actions,
  capacity and account checks. Apply only within the user's authorised scope.
- Provider readback: exact projects, privacy settings, private dashboards,
  insight queries and tile membership. A successful apply is not this proof.
- Runtime: matching bindings and real browser/backend sends on an isolated,
  explicitly enabled Preview before production rollout.
- Stored data: selected UUIDs counted once and separate backend event types.
  A capture return or HTTP success does not prove storage.
- Restoration: disable deliberate Preview capture through Alchemy, verify no
  SDK load or sends in a fresh browser, and clean up ephemeral resources.

Keep desired-state plans separate from provider drift. A no-change plan and a
successful drift command can coexist with reported provider differences. Record
them rather than repairing unrelated resources. A bounded receipt keeps source
identity, environment, plan/apply/readback and live checks separate; no secrets,
visitor identifiers, raw payloads or personal account details enter this skill.

## Primary sources

Reconcile current documentation with installed types:
[PostHog API](https://posthog.com/docs/api),
[projects](https://posthog.com/docs/settings/projects),
[capture](https://posthog.com/docs/api/capture),
[privacy](https://posthog.com/docs/privacy),
[Distilled source](https://github.com/distilled-cloud/distilled),
[Alchemy source](https://github.com/alchemy-run/alchemy) and
[Effect source](https://github.com/Effect-TS/effect).
