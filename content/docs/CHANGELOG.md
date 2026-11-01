# @content/docs

## 0.1.1

### Patch Changes

- 012f346: Render MDX with one Schema-checked light/dark theme and shared typography.
  Pierre returns paired token appearances in one call; Pele produces one SVG
  with both palettes and checked fonts. Rendered artifacts and the public content
  catalogue use version 2. Strict artifact operations also encode and decode themes.

  Move the public docs namespace to `/api/v2/docs`, including discovery and image
  paths, and update its generated client/OpenAPI and Website together. Calculator
  routes retain their existing version. The reading area's native Light, Dark and
  System controls switch prose, code and diagrams without rerendering providers.
