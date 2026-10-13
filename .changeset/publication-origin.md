---
"@taxkit/content": major
"@taxkit/sdk": patch
---

Discovery documents now name the TaxKit publication address. `DocsDiscoverySettings`
replaces `websiteOrigin` with `publicationOrigin`, checked by the new
`DocsPublicationOrigin` Schema, so canonical links name the published site even
when a separate Preview serves the page. The acceptance-record Schemas
(`PublicPageAcceptanceRecord`, its versions and `DocsAcceptedSourceDigest`) are
removed; page frontmatter now decides publication. Packages use Effect 4.0.2.
