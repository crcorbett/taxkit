---
"@taxkit/mdx": minor
"@taxkit/mdx-react": minor
"@taxkit/content": major
"@taxkit/api-http": patch
"web": patch
---

Move shared reading-node Schemas into MDX and introduce a content-neutral React presenter for blocks, code, tables, diagrams and paired themes. Keep publication rules in Content and routing, appearance state, clipboard commands and layout in the Website.

Preserve docs v2 JSON bytes while deriving Content values from MDX-owned branded types. The stronger nested TypeScript brands require callers constructing these values to use the owning Schemas. Retain compiled/rendered artifact formats and enforce neutral package dependencies.

Refresh generated OpenAPI heading-ID and link descriptions with the inherited nonempty and whitespace checks; the existing publication patterns already imply these constraints.
