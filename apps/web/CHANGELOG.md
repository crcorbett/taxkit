# TaxKit Website

## 0.0.7

### Patch Changes

- ccfbb17: Move shared reading-node Schemas into MDX and introduce a content-neutral React presenter for blocks, code, tables, diagrams and paired themes. Keep publication rules in Content and routing, appearance state, clipboard commands and layout in the Website.

  Preserve docs v2 JSON bytes while deriving Content values from MDX-owned branded types. The stronger nested TypeScript brands require callers constructing these values to use the owning Schemas. Retain compiled/rendered artifact formats and enforce neutral package dependencies.

  Refresh generated OpenAPI heading-ID and link descriptions with the inherited nonempty and whitespace checks; the existing publication patterns already imply these constraints.

- 7f99083: Improve the documentation reading experience with responsive navigation, a mobile menu, an active page outline, themed code blocks and copy controls. Keep keyboard access, native no-JavaScript navigation and light/dark appearance consistent across documentation and search.

  Use scoped Effect Atoms for menu, search and destination focus. Isolate outline updates from article rendering and reuse the canonical page's navigation during search.

  Adopt shared shadcn/Base UI components for docs actions, search, the mobile sheet, navigation collapsibles and code scroll areas. Centralise themed component variants and accessibility states while retaining native links and no-JavaScript controls.

  Polish selected navigation, keyboard focus and responsive title spacing. Remove decorative side stripes, preserve selected states on hover and keep fragment headings consistent with the article typography.

- Updated dependencies [ccfbb17]
- Updated dependencies [b1ef0a5]
  - @taxkit/mdx-react@0.1.0
  - @taxkit/content@5.0.0
  - @taxkit/api-http@4.0.1
  - @taxkit/webmcp@0.1.6

## 0.0.6

### Patch Changes

- 012f346: Render MDX with one Schema-checked light/dark theme and shared typography.
  Pierre returns paired token appearances in one call; Pele produces one SVG
  with both palettes and checked fonts. Rendered artifacts and the public content
  catalogue use version 2. Strict artifact operations also encode and decode themes.

  Move the public docs namespace to `/api/v2/docs`, including discovery and image
  paths, and update its generated client/OpenAPI and Website together. Calculator
  routes retain their existing version. The reading area's native Light, Dark and
  System controls switch prose, code and diagrams without rerendering providers.

- Updated dependencies [012f346]
  - @taxkit/content@4.0.0
  - @taxkit/api-http@4.0.0
  - @taxkit/webmcp@0.1.5

## 0.0.5

### Patch Changes

- Updated dependencies [70e7319]
  - @taxkit/content@3.2.2
  - @taxkit/api-http@3.1.4
  - @taxkit/webmcp@0.1.4

## 0.0.4

### Patch Changes

- Updated dependencies [786e719]
  - @taxkit/content@3.2.1
  - @taxkit/api-http@3.1.3
  - @taxkit/webmcp@0.1.3

## 0.0.3

### Patch Changes

- 990965c: Update Effect to 4.0.7 and Alchemy to beta.84, migrate the Cloudflare, Axiom and Doppler providers to their separate packages, and preserve the existing deployment identities. Keep telemetry authorization redacted through native planning and state migration.

  Keep the Website build hash focused on real workspace inputs, adopt the native redirect provider's refusal to write after a failed ruleset read, and regenerate OpenAPI with flattened unions and optional query parameters represented by omission rather than null.

  Use Alchemy's supported Node loader for local development and persist standalone native test bundles explicitly. Preserve HTTP 500 for internal Website faults and mismatched pages, while unavailable page reads retain their intended HTTP 503 through the updated TanStack error renderer.

  Refresh the remaining application, rendering, browser-test and development dependencies, including the native TypeScript compiler diagnostics and the SDK assembler's JavaScript compiler API.

- Updated dependencies [990965c]
  - @taxkit/api-http@3.1.2

## 0.0.2

### Patch Changes

- Updated dependencies [148fee7]
  - @taxkit/content@3.2.0
  - @taxkit/api-http@3.1.1
  - @taxkit/webmcp@0.1.2

## 0.0.1

### Patch Changes

- Updated dependencies [6ff0743]
- Updated dependencies [889f0cf]
  - @taxkit/content@3.1.0
  - @taxkit/api-http@3.1.0
  - @taxkit/calculators@2.2.0
  - @taxkit/webmcp@0.1.1
