---
document_type: runbook
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-13
review_trigger: Alchemy stack, stage, Doppler config, deployment command, deploy workflow or public check change
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
from a clean checkout of the commit being deployed; the
[GitHub Actions](#github-actions) workflows run the same commands once their
secrets exist and Actions can start.

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
GitHub holds only the read-only Doppler service tokens described under
[GitHub Actions](#github-actions).

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

## GitHub Actions

Two workflows run the same native commands as the sections above. Each passes
a read-only, config-scoped Doppler service token to Alchemy as `DOPPLER_TOKEN`;
GitHub sets `CI=true`. Neither workflow installs the Doppler CLI or holds a
Cloudflare value.

- `.github/workflows/preview.yml` runs on same-repository pull requests. Opened,
  reopened and synchronised pull requests run `pr:plan` and `pr:deploy` for
  `pr-<number>`, read both stage addresses from the deploy's stack outputs and
  check the Website, `/api/health` and `/api/v1/calculators` for 200. Closing
  the pull request runs `pr:destroy`. Fork pull requests get no job and no
  secret. Runs for one pull request share a concurrency group and never
  overlap; each rechecks the pull request's state before it plans or destroys.
- `.github/workflows/production.yml` runs on push to `main` and manual dispatch
  from `main`. It runs `production:plan`, `production:deploy --yes`, then checks
  `https://taxkit.dev` for 200, a `www` 301 that keeps path and query, and
  `https://api.taxkit.dev/api/health` for 200. `production:drift` runs last as
  information only: on Alchemy beta.81 it can report Workers with custom
  domains as changed after a clean deploy. Production runs share one
  concurrency group and never cancel a run in progress. The workflow does not
  run `bun run verification`; merges to `main` rely on the pull request's
  Checks run.

The owner must create, as in Common Practice, two GitHub environments, each
with one environment secret named `DOPPLER_TOKEN`:

| GitHub environment | Secret | Doppler service token |
| --- | --- | --- |
| `preview` (no branch restriction; pull request runs use `refs/pull/<number>/merge`) | `DOPPLER_TOKEN` | read-only, scoped to `taxkit/stg_preview` |
| `production` (deployment branch `main` only) | `DOPPLER_TOKEN` | read-only, scoped to `taxkit/prd` |

Pipe a new token straight into the secret so its value never appears in a
terminal or log:

```sh
doppler configs tokens create github-preview-actions --project taxkit --config stg_preview --access read --max-age <hours>h --plain | gh secret set DOPPLER_TOKEN --env preview --repo crcorbett/taxkit
doppler configs tokens create github-production-actions --project taxkit --config prd --access read --max-age <hours>h --plain | gh secret set DOPPLER_TOKEN --env production --repo crcorbett/taxkit
```

GitHub Actions currently cannot start jobs for this repository because of the
account's billing and spending limit, and these secrets do not exist yet. Until
both change, deploy with the local commands above. A local Production apply
must run only while the Production workflow is idle; GitHub concurrency does
not lock a local terminal.

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
