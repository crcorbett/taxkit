# Primary Sources and Version Policy

## Version policy

Alchemy and Effect APIs evolve. Before copying any example:

1. inspect the repository's lockfile and installed package version;
2. inspect installed exports and types;
3. consult the matching official documentation;
4. adapt structural examples to that version;
5. add a compile/test check.

Treat examples in this skill as architecture and policy unless they explicitly match the installed version.

## Alchemy

- [Alchemy infrastructure-as-code overview](https://alchemy.run/infrastructure-as-code/)
- [Stack](https://alchemy.run/infrastructure-as-code/stack/)
- [Provider](https://alchemy.run/infrastructure-as-code/provider)
- [Resource lifecycle](https://v2.alchemy.run/infrastructure-as-code/resource-lifecycle/)
- [Stages](https://v2.alchemy.run/concepts/stages)
- [Stack concepts](https://v2.alchemy.run/concepts/stack)
- [Provider concepts](https://v2.alchemy.run/concepts/provider)
- [CLI guide](https://v2.alchemy.run/guides/cli)
- [Destroy command](https://alchemy.run/cli/destroy)

## Providers

### Cloudflare website origins

The repository scaffold selects Alchemy `2.0.0-beta.79`. Its self URL examples
were checked against that release's source and package types:

- [Worker self URL binding](https://github.com/alchemy-run/alchemy/blob/v2.0.0-beta.79/packages/alchemy/src/Cloudflare/Workers/Worker.ts#L1311-L1324)
- [Local self URL resolution](https://github.com/alchemy-run/alchemy/blob/v2.0.0-beta.79/packages/alchemy/src/Cloudflare/Workers/LocalWorkerProvider.ts#L1533-L1553)
- [Website.Vite delegates to Worker](https://github.com/alchemy-run/alchemy/blob/v2.0.0-beta.79/packages/alchemy/src/Cloudflare/Website/Vite.ts)
- [Deployed self URL resolution](https://github.com/alchemy-run/alchemy/blob/v2.0.0-beta.79/packages/alchemy/src/Cloudflare/Workers/WorkerProvider.ts)

Recheck these contracts against the selected release when upgrading. These
sources establish address resolution.

### Provider documentation

- [Cloudflare Workers API](https://developers.cloudflare.com/api/resources/workers/)
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers observability](https://developers.cloudflare.com/workers/observability/)
- [Axiom datasets API](https://axiom.co/docs/restapi/endpoints/getDatasets)
- [Axiom OpenTelemetry for Cloudflare Workers](https://axiom.co/docs/guides/opentelemetry-cloudflare-workers)
- [WorkOS redirect URI API](https://workos.com/docs/reference/authkit/redirect-uri)
- [WorkOS redirect URI guidance](https://workos.com/docs/sso/redirect-uris)
- [WorkOS AuthKit API](https://workos.com/docs/reference/authkit)
- [Vercel deployments](https://vercel.com/docs/deployments)
- [Vercel Git deployments](https://vercel.com/docs/deployments/git)
- [Vercel project configuration](https://vercel.com/docs/project-configuration)
- [Vercel OIDC](https://vercel.com/docs/oidc)
- [Vercel Observability](https://vercel.com/docs/observability)

## Secondary repository research

DeepWiki guidance for [alchemy-run/alchemy](https://deepwiki.com/alchemy-run/alchemy) informed the explanations of Stacks, stages, Providers, Outputs, Resources, and Actions. Treat DeepWiki as explanatory secondary material. Resolve disagreements through installed types, source, and official documentation.

## Provenance principles

The policy also reflects repeated production patterns:

- composition-only root entrypoints;
- provider Layers and Schema-decoded input;
- declarative `datasets/**` and `dashboards/**`;
- capacity and entitlement preflights;
- retained adoption of foreign resources;
- Vercel Git as deployment owner unless expressly replaced;
- exact WorkOS callback lifecycle;
- independent provider readback;
- separate Preview, Production, and public proof;
- secret-negative portable receipts.
