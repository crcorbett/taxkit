# @taxkit/mdx-react

Content-neutral React presentation for checked MDX. The package depends on MDX
contracts, React, Base UI, Lucide and Effect's pure collection/matching tools.
It imports no Content, authored pages, router, application, provider engine,
runtime or Atom registry. See [ADR 0010](../../docs/adr/0010-agnostic-mdx-presentation.md).

## Exports

- `./body`: `MdxBody` renders the MDX-owned `ReadingBody` as semantic HTML. Its
  two named `Link` and `Code` presentation slots let a host bind its own routing
  and toolbar. Native anchors and `MdxCodeBlock` are the defaults. The optional
  `tableLabel` gives scrollable tables their accessible context.
- `./code-block`: `MdxCodeBlock` renders checked paired tokens once, preserving
  whitespace. `renderToolbar` receives the exact code text and language label;
  the host supplies commands such as copying or downloading. The package does
  not execute clipboard operations. The private Base UI ScrollArea adaptation
  derives from [shadcn's Base Nova source](https://ui.shadcn.com/r/styles/base-nova/scroll-area.json);
  its MIT notice is retained in [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES).
- `./theme`: `MdxTheme` formats the exact checked `Theme` into scoped CSS values
  and font stacks. It accepts `appearance` (`system`, `light`, `dark`) and native
  section props except `style`, which belongs to the checked theme formatter.
- `./schemas`: the owning `Appearance` Schema and its derived type.
- `./styles.css`: opt-in content, code, diagram, table and theme styles. JavaScript
  entries do not import CSS. The host loads fonts and supplies page layout.

```tsx
import { MdxBody } from "@taxkit/mdx-react/body";
import { MdxTheme } from "@taxkit/mdx-react/theme";
import "@taxkit/mdx-react/styles.css";

// `rendered` is an already-checked MDX RenderedDocument. Its blocks also
// satisfy ReadingBody; no projection, decoder, provider or registry is needed.
<MdxTheme theme={rendered.theme} appearance="light">
  <MdxBody body={rendered.blocks} />
</MdxTheme>;
```

## Native appearance controls

For a host whose radios also work before hydration and without JavaScript, mark
the theme root's direct controls container with `data-mdx-appearance-controls`.
Inside it, native radios use `data-mdx-appearance-option="system|light|dark"`.
The checked native choice overrides the component's appearance prop, including
System. Restricting the selector to this designated direct child prevents a
nested reader in the document body from choosing the outer reader's mode.
The host owns radio state, persistence and hydration; presentation owns only
the resulting CSS. The same markers can style a host recovery surface using
platform colours when no checked theme is available.

Code and table viewports are labelled, keyboard-focusable regions. Their shared
no-JavaScript fallback restores native scrollbars and hides inert custom tracks.
Normal rendering never evaluates source, mounts inline SVG or decodes props.
SVGs are images; MDX's format/size checks do not claim independent sanitisation.

Styles use native `light-dark`, `:has` and `@scope`. Theme-scoped token rules keep
nested readers independent. The actual Chromium 156 and Firefox 157 installations
qualify both appearance selection and nested token colours/font styles; no claim
is made for older engines or untested browser versions.

## Package policy and verification

This private source-only package has no build or runtime. Consumers need the
repository's TypeScript-aware bundler. Public subpaths are explicit; private
rendering steps and scroll parts are not exported. React 19 is a peer dependency.

`bun run --filter=@taxkit/mdx-react check-types` checks source and test types.
`bun run --filter=@taxkit/mdx-react test` exercises a standalone non-site article,
semantic and escaped output, exact code/toolbar data, host presentation slots
and independent theme/font choices through the public entries. The Website's
native suite qualifies hydration, themes, navigation, clipboard and no-JavaScript
integration. Workspace dependency and import tests enforce the neutral direction.
