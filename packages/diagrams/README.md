# @taxkit/diagrams

Private source package that draws Mermaid diagrams for TaxKit's docs. It
implements MDX's `DiagramRenderer` contract; MDX never imports this
package.

- `./mermaid` exports `MermaidDiagramRendererLive`, the only caller of
  `beautiful-mermaid`. It renders a diagram to SVG synchronously and without a
  DOM, using the Website's light palette, then checks the reply as a
  `DiagramSvg`.

Rejected Mermaid becomes `DiagramRenderError` with reason `render`; an
unusable reply becomes reason `svg`. The API build composes the Layer with the
MDX renderer, so diagrams are drawn before deployment. The Website shows the stored SVG as an image, so the diagram carries its
own colours and needs no browser script.
