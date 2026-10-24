# @taxkit/og-image

Private compiled package that draws TaxKit's 1200 × 630 PNG share images. It
implements Content's `DocsPageRenderer` and `DocsOgImages` contracts; Content
never imports this package. Only the API Worker composes it.

- `./takumi` exports `DocsPageRendererLive`, the only caller of Takumi
  (`takumi-js` and `@takumi-rs/wasm` 2.14.0). It decodes the bundled Geist font
  once when the Layer is built, renders the page's checked title, description
  and address, and checks the reply as `DocsPngBytes`.
- `./live` exports `DocsOgImagesLive`: one render at a time, a 30-second
  deadline, and a cache of eight images kept for five minutes. Failures are
  never cached.

A corrupt font fails Layer construction with `DocsImageRenderError` reason
`font`; Takumi rejection is reason `render`, an unusable reply `output` and a
missed deadline `timeout`. The Geist font (`src/geist-latin.base64.txt`) comes
from `@fontsource-variable/geist` 5.3.0 under the SIL Open Font License
(`src/geist.LICENSE.txt`); a test keeps it byte-for-byte equal to that package.
