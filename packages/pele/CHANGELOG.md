# @taxkit/pele

## 0.2.0

### Minor Changes

- 012f346: Render MDX with one Schema-checked light/dark theme and shared typography.
  Pierre returns paired token appearances in one call; Pele produces one SVG
  with both palettes and checked fonts. Rendered artifacts and the public content
  catalogue use version 2. Strict artifact operations also encode and decode themes.

  Move the public docs namespace to `/api/v2/docs`, including discovery and image
  paths, and update its generated client/OpenAPI and Website together. Calculator
  routes retain their existing version. The reading area's native Light, Dark and
  System controls switch prose, code and diagrams without rerendering providers.

## 0.1.0

### Minor Changes

- 70e7319: Add an independent, Schema-branded Pele Effect service and use it for MDX diagrams.
  Replace the legacy diagram adapter export with `@taxkit/diagrams/pele`. Diagram
  SVG styling and layout change while authored definitions, titles and document
  structure remain unchanged.

  Acquire Pierre's private highlighter instance inside its static Layer through
  the published API, with a distinct typed instance-creation error and an explicit
  host startup boundary for import-time WASM initialization. Simplify pure compiler
  mappings and preserve checked values through rendering and Content projection.
