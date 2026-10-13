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
settings and zone settings; a plan that would create, replace or delete the zone, or delete either
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
