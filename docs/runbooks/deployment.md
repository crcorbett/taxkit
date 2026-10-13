---
document_type: runbook
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-13
review_trigger: Alchemy stack, stage, Doppler config, deployment command or public check change
---

# Website and API deployment

`alchemy.run.ts` declares the Cloudflare API and Website for one stage. The
API is declared first; the Website receives the API's address and private
binding. Deploy them together so each stage's pair matches.

| Stage | Doppler config | Website | API |
| --- | --- | --- | --- |
| `prod` | `taxkit/prd` | `https://taxkit.dev` (`www` redirects) | `https://api.taxkit.dev` |
| `pr-<number>` | `taxkit/stg_preview` | the stage's `workers.dev` address | the stage's `workers.dev` address |
| `dev_native_apps` | none (local) | printed by `bun run dev` | printed by `bun run dev` |

Deploying needs the maintainer's explicit request. The commands run locally
from a clean checkout of the commit being deployed.

## Credentials

Native Alchemy reads the stage's Doppler config, then an ignored `.env`, and
never the shell environment. The Doppler config holds that stage's Cloudflare
account ID and API token. Alchemy authenticates to Doppler with `DOPPLER_TOKEN`
or an Alchemy profile login; locally, pass the repository's existing Doppler
login for the one command without printing it:

```sh
DOPPLER_TOKEN="$(doppler configure get token --plain)" bun run production:plan
```

Do not copy Cloudflare values into the shell, a committed file or GitHub.

The Production token (`taxkit/prd`) is an account-owned token. On the
`taxkit.dev` zone it holds Zone DNS Settings Read, Zone Settings Write, DNS Write
(DNSSEC), Bot Management Write, Dynamic URL Redirects Write and Workers Routes
Write; on the account, Workers Scripts, Workers Observability and Secrets Store
Write. Change it with `cf accounts tokens update`, keeping its name, expiry and
existing policies, and record the change here. It expires on 18 November 2026.

## Preview

```sh
bun run pr:plan pr-<number>
bun run pr:deploy pr-<number>
bun run pr:destroy pr-<number>
```

`pr:deploy` builds the repository first. Preview uses its own API, never the
Production API. Destroy the stage when its pull request closes.

## Production

```sh
bun run production:plan
bun run production:deploy
bun run production:drift
```

Review the plan. Production adopts and retains the `taxkit.dev` zone, DNS
settings, zone settings, DNSSEC and bot policy; a plan that would create, replace or delete the zone, or delete either
Worker, must stop. `production:drift` compares the deployed resources with
state.

## Check the deployment

1. Note both Worker version IDs from the deploy output.
2. Load the Website, a docs page and its `.md` page; calculate with and without
   JavaScript.
3. Check `https://www.taxkit.dev/<path>?<query>` returns a 301 to the same path
   and query on `taxkit.dev`.
4. Check API CORS from a browser page on another origin: public GETs and the
   calculation POST are allowed without credentials.
5. Repeat an eligible public GET with the same headers. The second response
   should show `CF-Cache-Status: HIT` and an `Age`. Calculation results,
   errors and `Set-Cookie` replies stay private and uncached.

## Observability

Production telemetry goes to Site's shared Axiom datasets `site-prod-logs`,
`site-prod-traces` and `site-prod-metrics` in the Axiom Personal organisation.
Site owns them; TaxKit owns its ingest token, dashboards and Cloudflare
destinations. The [deployment owner](../architecture/deployment.md#observability)
lists the resources and the exported fields.

### Management key

`AXIOM_TOKEN` in `taxkit/prd` is the Axiom API token
`taxkit-alchemy-management-20261013`, expiring on 21 December 2026. On the
three shared datasets it can create ingest and read queries; on the
organisation it can create and read API tokens, create, read and update
dashboards, and read datasets. It cannot write or delete datasets. Native
Alchemy reads it through the ordinary `prd` sources; no organisation ID is
needed. The trace-export stack also uses the Production Cloudflare token's
Workers Observability Write permission. Never print either value.

### Commands and order

```sh
DOPPLER_TOKEN="$(doppler configure get token --plain)" bun run axiom:plan
DOPPLER_TOKEN="$(doppler configure get token --plain)" bun run axiom:deploy
DOPPLER_TOKEN="$(doppler configure get token --plain)" bun run trace:plan
DOPPLER_TOKEN="$(doppler configure get token --plain)" bun run trace:deploy
DOPPLER_TOKEN="$(doppler configure get token --plain)" bun run production:plan
```

Deploy in this order, each after its own reviewed plan:

1. `axiom:*` (`TaxKitObservability/prod`): the retained `taxkit-telemetry-ingest`
   token and the four dashboards.
2. `trace:*` (`TaxKitTraceExport/prod`): the retained `taxkit-axiom-logs` and
   `taxkit-axiom-traces` destinations. Its plan reads the token from step 1 and
   fails until that exists.
3. `production:*`: the Workers attach `taxkit-axiom-logs`. Its plan reads the
   destination names from step 2 and fails until they exist.

Each stack accepts only `--stage prod`. A plan that would replace the ingest
token, or replace or delete a destination or dashboard, must stop. A
dashboard-only change updates the four dashboards and nothing else.

### Check after a Production release

1. Read both Production Workers' settings in Cloudflare: logs enabled at
   sampling rate 1 with destination `taxkit-axiom-logs`, invocation logs,
   persistence and traces off, and no Axiom binding.
2. Request a few uncached Website pages, one no-JavaScript calculation and one
   API calculation with a unique query string. Record the time window.
3. After the delivery delay, query `site-prod-logs` for that window and the
   `taxkit-api` and `taxkit-web` services. Expect one `taxkit.request` record
   per request and inspect complete envelopes: no URL, query, header, user
   agent, IP address, body, tax figure or error text. Uncaught exceptions and
   framework console output bypass the fixed logger, so check for them too.
4. Open the four dashboards and confirm their panels fill.

An exporter accepting records is not proof they were stored or that they are
safe; record what the stored rows showed.

### Rotation and removal

The token, dashboards and destinations are retained: removing a declaration or
destroying a telemetry stack leaves them in place. Axiom has no token update
API, so changing the token's props replaces it and leaves the old token live.
Prove the new token through the destinations, then revoke the old one in
Axiom. Replace `AXIOM_TOKEN` in `taxkit/prd` before 21 December 2026, keeping
the same scope. Native state holds the ingest token value; never print it.

## Rollback

Check out the previous working commit and run the same deploy command for the
stage. Cloudflare caches are version-scoped, so the redeployed versions start
with empty caches. Activation of the two Workers is not atomic; a short overlap
of old and new versions is possible.

## Known limits

- The native Alchemy redirect provider treats a failed read of the zone's
  shared redirect ruleset as an empty ruleset. A later successful write then
  holds only TaxKit's `www` rule and can remove redirect rules owned elsewhere
  in the zone. The `taxkit.dev` zone holds only TaxKit's own rule; check the
  zone's redirect rules before adding another owner. The Worker upload happens
  before the redirect rule is written.
- Seven-day Cloudflare freshness lets Cloudflare reuse a response; it does not
  guarantee that the cache keeps it.
