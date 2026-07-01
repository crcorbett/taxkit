# @whattax/docs-content

## 0.0.2

### Patch Changes

- 36e7f6c: Expose the docs content live layer through a narrow package export for the new
  docs app runtime.
- b5b4858: Resolve renderable page source paths from canonical docs navigation instead of
  slug inference, parse MDX frontmatter with YAML before canonical Effect Schema
  decode and make the private source-only export contract explicit.
- 25f381d: Refactor docs-content to use reusable Fumadocs config helpers and serve page
  lookup data from the generated Fumadocs source loader, including a browser-safe
  client collection export for compiled MDX rendering.

  Strengthen docs validation with navigation coverage checks and an explicit MDX
  component allowlist for authored content.

- ddea2c7: Add the private docs content Effect service, live layer and package-owned
  validation policy for the public MDX docs corpus.
- a5eb82f: Add the private docs content package with Effect Schema-owned frontmatter,
  navigation and meta contracts plus a Fumadocs MDX source boundary for the
  public docs content root.
- 98bba1d: Validate docs example references and the OpenAPI reference exclusion through the docs-content validation policy.
- Updated dependencies [25f381d]
  - @whattax/docs-fumadocs@0.0.2
