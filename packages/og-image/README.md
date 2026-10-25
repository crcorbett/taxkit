# @taxkit/og-image

Private compiled package that draws TaxKit's 1200 × 630 PNG share images at
build time. It implements Content's `DocsPageRenderer` contract; Content never
imports this package. Only the API build script composes it, so no Worker
bundles Takumi.

- `./takumi` exports `DocsPageRendererLive`, the only caller of Takumi
  (`takumi-js` and `@takumi-rs/wasm` 2.14.0). It decodes the bundled Geist font
  once when the Layer is built, renders the page's checked title, description
  and address, and checks the reply as `DocsPngBytes`.
- `./archive` exports `renderDocsImageArchive`, which draws every page in the
  checked catalogue into Content's `DocsImageArchive`. The API build writes it
  to `apps/api/src/generated/docs-images.json`.

A corrupt font fails Layer construction with `DocsImageRenderError` reason
`font`; Takumi rejection is reason `render` and an unusable reply `output`. The
API's reader uses reason `missing` for a page with no stored image. The Geist
font (`src/geist-latin.base64.txt`) comes from `@fontsource-variable/geist`
5.3.0 under the SIL Open Font License (`src/geist.LICENSE.txt`); a test keeps it
byte-for-byte equal to that package.
