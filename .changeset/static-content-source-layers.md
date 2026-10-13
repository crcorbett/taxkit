---
"@taxkit/content": major
"@taxkit/docs-fumadocs": major
"@taxkit/docs-content": major
---

Content and Fumadocs source Layers are static. `ContentDiscoveryLive` now
requires `ContentDiscoverySettings`; supply the lazy settings Effect with
`Layer.succeed(ContentDiscoverySettings)(settings)`. A settings failure still
fails `getDocument`, not Layer construction. `makeFumadocsSourceLive(adapter)`
is replaced by `FumadocsSourceLive`, which requires
`FumadocsGeneratedCollection` from `@taxkit/docs-fumadocs/service`; the
`FumadocsGeneratedCollectionAdapter` type moves to that export.
`makeFumadocsSourceTest(fixtures)` and `makeDocsContentServiceTest(fixtures)`
are replaced by `FumadocsSourceTest` and `DocsContentServiceTest`, which require
`FumadocsSourceFixtures` from `@taxkit/docs-fumadocs/test`.
