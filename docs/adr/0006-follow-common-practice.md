# Follow Common Practice's structure

In October 2026 Cooper chose to make TaxKit's Website, API and repository
follow Common Practice, which is the better standard, and the shared
development-workflows skills. The work landed in seven pull requests. Each
choice below keeps one owner for each fact and removes machinery TaxKit no
longer needs.

## Removed

- The owned publishing RPC package and endpoint. Browsers and the server read
  the API with the generated HTTP client.
- The no-JavaScript calculator form, its forwarding key and the Website
  analytics relay. Calculators need JavaScript and show a notice without it.
- Compiled MDX and the old content pipeline. Pages are plain MDX, read once by
  the API build into a checked JSON catalogue, so a Worker never parses MDX on
  a request. Code uses `@pierre/highlights` and diagrams use
  `beautiful-mermaid`, each in its own package (`@taxkit/mdx`,
  `@taxkit/diagrams`).
- `@taxkit/publication`, the Website's build-time share images and its own
  metadata files.
- The Website's own request wrappers and copied errors, the copied skills in
  `.agents/skills`, the separate local Alchemy stack, and the documentation
  governance pages.

## Adopted

- `@taxkit/aeo` and `@taxkit/og-image`, matching Common Practice's packages:
  the API serves discovery files and share images, drawn when it is built; the
  Website forwards its own addresses once. A Markdown `Accept` preference at a
  page answers 307 to its `.md` file, cached beside the page.
- Logic lives in packages and `apps/web/src/lib` stays thin, in Common
  Practice's folders. `@taxkit/api-http` owns the generated client's named
  reads, errors and negotiation; `@taxkit/calculators` owns the browser
  calculator page and its tools; `@taxkit/webmcp` owns the WebMCP bridge and
  keeps the form tools.
- The five normal checks (`build`, `lint`, `check-types`, `knip`, `test`), one
  test layout (`test/` in each workspace), the latest shared lint plugin, and
  `alchemy dev` on the main stack for local development.
- A root `ARCHITECTURE.md`, a short docs index, and kept ADRs and runbooks.

## Kept

Server-only Website modules keep the `.server` name that TaxKit's lint rules
use. At adoption, the public HTTP contract, SDK and calculator results did not
change.

## Package export policy amendment

The subsequent package migration removed the repository-wide `source` export
condition. Private packages export TypeScript source directly, without a build
or `dist` directory. Only the public `taxkit` SDK compiles and exports `dist`;
its archive includes the private modules it needs. The current ownership rules
are in [package ownership](../architecture/package-ownership.md).

[Architecture](../../ARCHITECTURE.md) describes the current system.
