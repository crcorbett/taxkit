---
document_type: runbook
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-22
review_trigger: Alchemy stack, stage, Doppler config, deployment command, deploy workflow or public check change
---

# Website and API deployment

`alchemy.run.ts` declares the Cloudflare API and Website for one stage. The
API is declared first; the Website receives the API's address and private
binding. After both are declared, the API receives the same-stage Website
address through a native binding for MCP browser admission. Native Worker
precreation resolves the address cycle. Deploy them together so each stage's
pair matches.

| Stage | Doppler config | Website | API |
| --- | --- | --- | --- |
| `prod` | `taxkit/prd` | `https://taxkit.dev` (`www` redirects) | `https://api.taxkit.dev` |
| `pr-<number>` | `taxkit/stg_preview` | the stage's `workers.dev` address | the stage's `workers.dev` address |
| `dev_native_apps` | none (local) | native local address, strict port 3220 | native local address, strict port 3221 |

Deploying needs the maintainer's explicit request. The commands run locally
from a clean checkout of the commit being deployed; the
[GitHub Actions](#github-actions) deploy jobs run the same commands once their
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

When the workstation provides separate scoped token variables, select native
Alchemy authentication for the command explicitly:

```sh
DOPPLER_TOKEN="$DOPPLER_PROVIDER_TOKEN" bun run pr:plan pr-<number>
DOPPLER_TOKEN="$DOPPLER_PRODUCTION_TOKEN" bun run production:plan
```

`DOPPLER_PROVIDER_TOKEN` is scoped to `taxkit/stg_preview` and
`DOPPLER_PRODUCTION_TOKEN` to `taxkit/prd`. The separate development and CI
tokens belong to `taxkit/dev` and `taxkit/ci`; they are not deployment fallbacks.
Only the selected token is passed as native `DOPPLER_TOKEN`; native sources
continue selecting managed values, and no secret value is printed.

The modern-only MCP cutover removes `TaxKitMcpSessions` from the native Worker
class/export/binding graph. Review the native deletion migration for exactly
that namespace before apply and confirm its absence afterward. This deletion
is permanent; an old-code redeploy cannot recover its data or former sessions.
The graph no longer declares the former `TaxKitWebsiteForwardingKey` Random
resource, so the first plan after its removal deletes it from a stage that still
holds it. Doppler supplies deployment credentials.

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

`pr:deploy` builds the repository first. `pr:plan` and `production:plan` build
the API first, because the API Worker imports the docs catalogue its build
writes. Preview uses its own API, never the Production API.
Destroy the stage when its pull request closes.

`pr:destroy` validates the first-argument `pr-<number>` stage and rejects
`--stage` overrides before doing work. It then builds the API, for the same
reason, and invokes native Alchemy destroy. No browser is needed. The workflow rechecks that the pull request
is closed and validates its stage before running it.

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

1. Note both active Worker version IDs from Cloudflare deployment readback;
   the native deploy summary may omit them.
2. Load the Website, a docs page and its `.md` page; calculate at `/` with
   JavaScript, and check that with JavaScript off it shows "Turn on JavaScript
   to use this calculator."
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
2. Request a few uncached Website pages and one API calculation with a unique query string. Record the time window.
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

## GitHub Actions

Every job that uses `DOPPLER_TOKEN` first checks that its environment secret is
set. Only a true/false value reaches that step, so a missing secret stops the
job in seconds instead of at the first native command after verification. The
token itself reaches only the native plan, deploy, destroy and drift steps.

On the installed Alchemy (beta.81, unchanged in beta.83), `deploy --yes` and
`destroy --yes` both approve the plan and let Alchemy set up or upgrade the
shared Cloudflare state store. The stack disables the shell as a config source,
so the state store never sees `CI=true` and CI alone does not stop that. Each
workflow therefore runs the same stage
without `--yes` first: `pr:plan`, `production:plan` or `pr:destroy --dry-run`,
all with `--no-input`. That run fails when the store is missing or on another
version, and the `--yes` step runs only after it passes. Run local commands the
same way: `--no-input`, and `--yes` only after a clean plan. A deploy with no
changes needs only `--no-input`.


`.github/workflows/checks.yml` is the only workflow. As in Common Practice,
verification runs once per revision and the deploy jobs reuse that result:

- `checks` runs `bun run verification` on pull requests, pushes to `main` and
  manual dispatch. It checks out the pull request head (or the pushed commit),
  the same revision the deploy jobs check out. Trusted runs read the Turbo
  remote cache values from Doppler `taxkit/ci` through `DOPPLER_CI_TOKEN`;
  fork pull requests run the same verification with the local cache and no
  credential. Verification finishes with the required credential-free
  `test:native` build and suite, sequentially after all source-rewriting tests
  and earlier builds. A pull request is verified as its head commit, not
  GitHub's merge preview; the push to `main` verifies the merged result before
  Production deploys. A newer push cancels superseded verification.
- `deploy` (Deploy preview) `needs: checks`, so it starts only after
  verification of that head commit succeeds. It runs for opened, reopened and
  synchronised same-repository pull requests: `pr:plan` and `pr:deploy` for
  `pr-<number>`, then it reads both stage addresses from the deploy's stack
  outputs and checks the Website, `/api/health` and `/api/v1/calculators` for
  200.
- `cleanup` (Destroy preview) runs when a same-repository pull request closes:
  the stage-validated `pr:destroy --dry-run --no-input`, then `pr:destroy --yes --no-input`.
  It installs no browser. Fork pull requests get no deploy or cleanup job and no secret.
  Deploy and cleanup for one pull request share a concurrency group and never
  overlap or cancel each other; each rechecks the pull request's state before
  it plans or destroys.
- `production` (Deploy production) `needs: checks` and runs only for a push to
  `main` or a manual dispatch from `main`, deploying the commit `checks` just
  verified: `production:plan`, `production:deploy --yes --no-input`, then checks
  `https://taxkit.dev` for 200, a `www` 301 that keeps path and query, and
  `https://api.taxkit.dev/api/health` for 200. `production:drift` runs last as
  information only: on Alchemy beta.81 it can report Workers with custom
  domains as changed after a clean deploy. Production runs share one
  concurrency group and never cancel an apply in progress.

Each deploy job passes a read-only, config-scoped Doppler service token to
Alchemy as `DOPPLER_TOKEN`; GitHub sets `CI=true`. No job installs the Doppler
CLI or holds a Cloudflare value. A failed `checks` job, including a native
failure, prevents both planning and deployment. Deploy builds use the local
Turbo cache only; `DOPPLER_CI_TOKEN` stays with `checks`, so a remote cache
written by unmerged pull request runs never feeds a deployed build.
`release:check` inherits the same verification gate locally; run verification
before an authorised local deployment.

`[skip ci]` in a commit message, including a merge commit, skips the whole
workflow: that commit gets no verification and, on `main`, no Production
deploy. Use it only for commits that change maintainer documentation alone
(`docs/`, READMEs, `AGENTS.md`). Public docs under `content/docs` ship
with the Website and need the deploy. Never use it for a code, workflow,
package, dependency or Changeset change, or to merge a pull request that
contains one, unless the maintainer explicitly requests a release from this workstation.
For an authorised local Website/API release, run full verification here, merge
through a normal pull request, and deploy the clean merge commit using the
plan, apply and public checks above. Skip the automatic deploy for that release
commit so it cannot overlap the local apply; do not change CI settings or bypass
required branch checks. Local SDK-only npm releases follow the
[local publication procedure](./versioning.md#local-sdk-publication).
A local SDK-only release runs the package checks locally and does not deploy
the Website or API. Release evidence does not need its own skipped commit; see
[Versioning](./versioning.md#release-evidence).

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

Check current workflow runs and environment configuration before selecting the
release path; dated billing or secret-availability observations are not a
current gate. Use the local commands above when the maintainer requests a local
release or a current runner limitation prevents CI from starting. A local
Production apply must run only while no `production` job is running or queued;
GitHub concurrency does not lock a local terminal.

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
