# @taxkit/api-mcp

## 0.2.3

### Patch Changes

- Updated dependencies [148fee7]
  - @taxkit/content@3.2.0
  - @taxkit/api-http@3.1.1

## 0.2.2

### Patch Changes

- Updated dependencies [6ff0743]
- Updated dependencies [889f0cf]
  - @taxkit/content@3.1.0
  - @taxkit/api-http@3.1.0
  - @taxkit/calculators@2.2.0

## 0.2.1

### Patch Changes

- Updated dependencies [b88ee2d]
- Updated dependencies [b533bc7]
  - @taxkit/content@3.0.0
  - @taxkit/api-http@3.0.0
  - @taxkit/calculators@2.1.0

## 0.2.0

### Minor Changes

- 737ffcd: Use Effect's native request-scoped modern MCP transport in the Alchemy Worker
  and retire legacy session hosting. Website calculations now use the native HTTP
  binding with a stage-owned forwarding secret and the existing shared allowance.

  Expose canonical browser-safe calculator summaries, finish docs RPC page
  correlation, and strengthen checked-example publication and parser-owned MDX
  validation. Align the compatible Effect patch cohort and retain native
  credential, request and response lifetime boundaries.

  Generated OpenAPI now explicitly documents JavaScript's safe-integer bounds for
  `Money.cents`, matching its existing `Schema.Int` validation. The Effect patch
  upgrade changes this schema metadata without changing accepted money values.

### Patch Changes

- Updated dependencies [dc9d0ba]
- Updated dependencies [501d419]
- Updated dependencies [20a9dcc]
- Updated dependencies [0d82b82]
- Updated dependencies [7dbd09b]
- Updated dependencies [ded95d3]
- Updated dependencies [be1fcc4]
- Updated dependencies [bd9df35]
- Updated dependencies [48384d5]
- Updated dependencies [facca83]
- Updated dependencies [15bf685]
- Updated dependencies [02c813f]
- Updated dependencies [6b2a857]
- Updated dependencies [1e72f6b]
- Updated dependencies [d39a16e]
- Updated dependencies [876b485]
- Updated dependencies [049b04f]
- Updated dependencies [4b75366]
- Updated dependencies [737ffcd]
- Updated dependencies [5221b42]
- Updated dependencies [103feda]
- Updated dependencies [1b85440]
- Updated dependencies [c1f3d69]
- Updated dependencies [48f4681]
- Updated dependencies [37abee7]
- Updated dependencies [72c8f42]
- Updated dependencies [59b0a36]
- Updated dependencies [4b75366]
- Updated dependencies [4b75366]
- Updated dependencies [1fea106]
- Updated dependencies [a1e2f28]
  - @taxkit/content@2.0.0
  - @taxkit/calculators@2.0.0
  - @taxkit/api-http@2.0.0
