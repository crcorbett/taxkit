---
"@taxkit/content": minor
"@taxkit/docs-content": patch
---

Add a compiled content contract and service for accepted pages, navigation and
bounded search. Drafts and inconsistent catalogue entries fail validation.
Keep the existing docs-content schema and error imports as compatibility
re-exports; authored MDX and its compiler remain in docs-content.
