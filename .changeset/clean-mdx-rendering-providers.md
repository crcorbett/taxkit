---
"@taxkit/pele": minor
"@taxkit/diagrams": minor
"@taxkit/mdx": patch
"@taxkit/content": patch
"api": patch
"taxkit": patch
---

Add an independent, Schema-branded Pele Effect service and use it for MDX diagrams.
Replace the legacy diagram adapter export with `@taxkit/diagrams/pele`. Diagram
SVG styling and layout change while authored definitions, titles and document
structure remain unchanged.

Acquire Pierre's private highlighter instance inside its static Layer through
the published API, with a distinct typed instance-creation error and an explicit
host startup boundary for import-time WASM initialization. Simplify pure compiler
mappings and preserve checked values through rendering and Content projection.
