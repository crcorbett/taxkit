# Website design

The documentation UI follows the quiet reading layout of
[Blume's documentation](https://useblume.dev/docs), using TaxKit's checked MDX
theme. The Website owns navigation, responsive layout and interactions; Content
owns the page, its theme and rendered artifacts. Calculator pages retain their
own layout, described under [Calculator pages](#calculator-pages).

## Layout and typography

`src/lib/docs/styles.css` owns the documentation layout and host UI aliases;
`@taxkit/mdx-react/styles.css` owns reading content and checked theme formatting.
`src/components/ui/styles.css` owns general component styles. The sticky header is
64px tall. The desktop layout has a 248px navigation rail, a reading column up
to 43.5rem wide and a 224px page outline, within a 1440px shell. Both rails can
scroll independently. Below 78rem the page outline becomes an inline native
disclosure. Below 58rem the navigation moves into a modal drawer.

Use restrained borders and spacing to group content. Keep the canvas quiet,
reserve the accent for links and selection, and do not change font weight on
hover or selection. The article title has the full reading width; its
breadcrumb and fixed-width Copy page control sit in a separate row. Footer
links and previous/next pages remain available on phones.

Selected navigation uses one quiet rounded fill and accent text, without an
inset stripe or side border. Its selection stays visible on hover. Fragment
destinations keep the heading's foreground colour; the page outline indicates
the active section. Keyboard focus uses a complete neutral outline derived
from the theme foreground, inset inside navigation rows, code viewports and
appearance options so scroll containers do not clip it.

Bundle Inter locally, preload its opening Latin normal face, and supply a real
italic face. Disable synthetic font styles. The desktop scale is 44px for the
page title, 28px for section headings, 18px for the introduction, 16px for prose,
and 14px for navigation and code. Titles retain 44px through tablet widths and
reduce to 34px on phones, with -0.04em tracking. Below 58rem the inline outline
has a 16px bottom gap so it does not crowd out the article title. Code uses the
theme's monospace stack, preserves whitespace and scrolls horizontally within
its labelled viewport.

## Themes

`MdxTheme` from `@taxkit/mdx-react/theme` maps the checked page theme's semantic
roles into scoped CSS variables. The Website supplies its `docs-reader` class
for layout and maps the neutral values onto its general UI tokens.
The canvas uses the light surface and dark background; quiet borders and
selected states derive from those roles with CSS colour mixing. Code tokens
retain their paired colours and font styles. Diagram images embed both schemes
in their SVG; neither feature loads a browser renderer.

Native System, Light and Dark radios select `color-scheme` with CSS `:has`.
They work before hydration and without JavaScript. With JavaScript, one
`docsAppearanceAtom` retains the choice across client navigation, including
search, in the existing router/React registry. Reloading returns to the device
default. There are no appearance cookies or browser storage reads. A loading
navigation retains the resolved shell and its theme. Recovery pages without a
checked theme use platform `Canvas`, `CanvasText` and `LinkText` colours and the
same appearance choice.

## Components and interaction

Use the app-owned [shadcn/Base UI components](src/components/ui/README.md): Sheet
for the mobile menu, Collapsible for navigation sections, Button for actions,
and Input/Field for search. The neutral [MDX React presenter](../../packages/mdx-react/README.md)
owns prose, token/diagram presentation and its private Base UI/shadcn code/table
scroll regions. The general components adapt shadcn's
Base UI registry to the existing CSS toolchain, centralising variants, sizing,
focus and disabled states. Their semantic variables inherit the checked MDX
theme. Keep feature state and composition in the docs containers. Use native
links with shared button styling where appropriate; preserve native radios,
GET forms and disclosures for progressive enhancement.

- Interactive targets are at least 44px. Hover treatments apply only to devices
  that support hover. Focus has a visible neutral outline.
- The drawer is labelled, traps focus, scrolls long navigation, closes with
  Escape and restores the trigger. Following a page link closes it and focuses
  the article heading, including a link to the current page. Its portal stays
  inside the themed subtree. Modified clicks retain normal browser behaviour.
  One static Atom owns its closed/open/following-link state and resets when the
  menu unmounts; Base UI owns the dialog mechanics. Search drafts use a static
  `Atom.family` keyed by the submitted term.
- The skip link targets the article heading. Initial hydration leaves focus
  alone; ordinary client navigation records the destination in a registry Atom.
  A scoped native Router subscription consumes it after that destination renders,
  without taking over hash or scroll restoration. Superseding navigation clears it.
- “On this page” uses native fragment links. A scoped IntersectionObserver
  marks the current checked heading, including the final heading at the end of
  the document. Only the outline leaves subscribe to that Atom; semantic equality
  suppresses repeated selections, so scrolling does not rerender the article.
  The mobile outline is a native disclosure.
- Search retains a native GET form and a client navigation enhancement. The
  route remains the sole owner of URL validation and loading; its native loader
  dependencies distinguish queries during Back and Forward navigation.
- Each copy control owns independent Effect Atom feedback (a static family
  keyed by the control's React ID and its text) and uses the native
  Effect Clipboard service, with a five-second deadline. Feedback has a stable
  footprint, is announced politely and offers manual copying on refusal. It
  never displays or reports the browser's private failure message.
- Without JavaScript, navigation stays expanded, a native mobile disclosure
  exposes it, and inert menu/copy/collapse controls are hidden. Code viewports
  remain focusable and expose native scrollbars. Markdown and source links
  remain available.

Keep the native appearance radios in the header's direct
`data-mdx-appearance-controls` slot, with `data-mdx-appearance-option` on each
input. The package owns mode formatting; the Website owns the Atom and choices.
Bind `MdxBody`'s named link/code slots to the Website's Router/focus and Clipboard
adapters. Never move publication, page layout or the Atom runtime into MDX.

The drawer uses a 220ms transform and a 180ms backdrop opacity transition.
Reduced motion removes both transitions. Do not animate article navigation or
make information depend on motion.

## Calculator pages

`src/styles.css` sets the site palette as the shared semantic tokens
(`--background`, `--foreground`, `--border`, `--input`, `--ring`,
`--destructive` and the rest) on `body` with `light-dark()` and
`color-scheme: light dark`, so calculator and agent pages, their native
controls and scrollbars follow the device's light or dark preference. No
calculator rule uses a colour literal; documentation replaces the tokens with
its checked theme inside `.docs-reader`.

- Pages are top-aligned (`align-content: start`) with no viewport-height
  centring, so a result, error or opened breakdown grows downward and the form
  never moves. Answers use tabular figures.
- The calculator title is the page's `<h1>` and its `<title>`; the context line
  follows it. The breakdown uses `<h2>`/`<h3>` inside `details`.
- Fields use `Field`/`FieldLabel` and the shared Input and Button styling
  contracts (`data-slot="input"` and `buttonVariants` from
  `components/ui/button-variants.ts`) on native controls, so calculator pages
  load no Base UI runtime. Inputs keep 16px text; the select matches them.
- An invalid field gets a destructive border, `aria-invalid` and its own
  message below it, and receives focus. A calculation failure is one alert
  below the form.
- Site navigation links are 44px-tall inline-flex targets; the current page
  has a quiet filled background, and hover underlines only on hover devices.
- Root renders `main` only for calculator and agent pages, with `aria-busy`
  during navigation. Documentation routes render their own header, `main`
  (wrapping the article, marked busy while the next page loads) and asides.

## Verification

The browser clipboard tests check exact copied whitespace, independent feedback
and safe refusal. The native Website/API suite covers hydration, focus,
navigation, active outlines, 320px/390px layouts, the drawer, search, paired
themes, horizontal scrollbar sizing and dragging, no-JavaScript navigation and
keyboard scrolling. The calculator browser test covers invalid-field marking,
description and focus. Review actual browser
screenshots at desktop, tablet and phone sizes in both themes; automated layout
assertions do not establish visual quality.

See the [Website README](README.md) for commands and the
[frontend architecture](../../docs/architecture/frontend.md) for runtime and
transport ownership.
