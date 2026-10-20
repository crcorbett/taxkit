---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-observability-owner
last_reviewed: 2026-10-18
review_trigger: host identity, observation vocabulary, redaction or runtime export change
---

# `@taxkit/observability`

Private compiled runtime support shared by API and Website hosts and deployment
queries. This package has no Alchemy, infrastructure or provider SDK dependency.

`./host-telemetry` owns the fixed request event Schema, closed service and route
vocabulary, response-ready observation and safe host logger/reporter Layers.
Hosts classify their own routes. Raw paths, URLs, queries, headers, caller keys,
tax facts, calculation results and arbitrary Causes never become event fields.
The deployment dashboards consume the same event identity and service Schema.

`./edge-identity` owns the shared Cloudflare caller-key admission and host-mode
Schema. It rejects Worker subrequests and accepts only checked direct edge
identity; shared calculation services never read Cloudflare headers. Website
forwarding uses native HTTP with a separately verified private credential and
checked original caller key on canonical calculation POSTs. This export owns
the forwarding header names and redacted credential Schema; the API host owns
authentication and method/path policy. Neither field enters financial payloads,
public settings, logs or cache keys.

`./stage` owns the hosted stage Schemas: branded `PullRequestStage`
(`pr-1` to `pr-9999999`) and `DeploymentStage` (`prod` or one pull-request
stage). Analytics capture settings and infrastructure secret selection reuse
them; infrastructure adds only its local `dev_<name>` stage. The root `pr:plan`,
`pr:deploy` and `pr:destroy` host scripts check the same bounded
`pr-[1-9][0-9]{0,6}` pattern in shell before Alchemy starts, so keep the two in
step.

The native Worker declaration and binding types belong to
[`@taxkit/infrastructure`](../infrastructure/README.md). Root composition joins
that deployment identity with the API implementation.

The [deployment runbook](../../docs/runbooks/deployment.md) owns platform
telemetry configuration and provider readback. Package tests prove field safety
and observation policy, not remote delivery or ingestion.
