---
document_type: design-guide
lifecycle: current
authority: canonical
owner: taxkit-web-app-owner
last_reviewed: 2026-11-02
---

# Website design

The documentation UI follows the quiet reading layout of
[Blume's documentation](https://useblume.dev/docs), using TaxKit's checked MDX
theme. The Website owns navigation, responsive layout and interactions; Content
owns the page, its theme and rendered artifacts. Calculator pages retain their
own layout.

## Layout and typography

`src/lib/docs/styles.css` owns the documentation layout and theme mapping;
`src/components/ui/styles.css` owns shared component styles. The sticky header is
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

`DocsReader` maps the checked page theme's semantic roles into CSS variables.
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
for the mobile menu, Collapsible for navigation sections, ScrollArea for code,
Button for actions, and Input/Field for search. The components adapt shadcn's
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
  One mount-local Atom owns its closed/open/following-link state; Base UI owns
  the dialog mechanics. Search drafts also use mount-local Atoms.
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
- Each copy control owns independent Effect Atom feedback and uses the native
  Effect Clipboard service, with a five-second deadline. Feedback has a stable
  footprint, is announced politely and offers manual copying on refusal. It
  never displays or reports the browser's private failure message.
- Without JavaScript, navigation stays expanded, a native mobile disclosure
  exposes it, and inert menu/copy/collapse controls are hidden. Code viewports
  remain focusable and expose native scrollbars. Markdown and source links
  remain available.

The drawer uses a 220ms transform and a 180ms backdrop opacity transition.
Reduced motion removes both transitions. Do not animate article navigation or
make information depend on motion.

## Verification

The browser clipboard tests check exact copied whitespace, independent feedback
and safe refusal. The native Website/API suite covers hydration, focus,
navigation, active outlines, 320px/390px layouts, the drawer, search, paired
themes, horizontal scrollbar sizing and dragging, no-JavaScript navigation and
keyboard scrolling. Review actual browser
screenshots at desktop, tablet and phone sizes in both themes; automated layout
assertions do not establish visual quality.

See the [Website README](README.md) for commands and the
[frontend architecture](../../docs/architecture/frontend.md) for runtime and
transport ownership.
