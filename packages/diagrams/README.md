# @taxkit/diagrams

Private compiled package that draws Mermaid diagrams for TaxKit's docs. It
implements Content's `DocsDiagramRenderer` contract; Content never imports this
package.

- `./mermaid` exports `DocsDiagramRendererLive`, the only caller of
  `beautiful-mermaid`. It renders a diagram to SVG synchronously and without a
  DOM, using the Website's light palette, then checks the reply as a
  `DocsDiagramSvg`.

Rejected Mermaid becomes `DocsDiagramRenderError` with reason `render`; an
unusable reply becomes reason `svg`. The API composes the Layer with the MDX
reader. The Website shows the stored SVG as an image, so the diagram carries its
own colours and needs no browser script.
