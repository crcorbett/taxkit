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

`src/lib/docs/styles.css` owns the documentation styles. The sticky header is
64px tall. The desktop layout has a 248px navigation rail, a reading column up
to 43.5rem wide and a 224px page outline, within a 1440px shell. Both rails can
scroll independently. Below 78rem the page outline becomes an inline native
disclosure. Below 58rem the navigation moves into a modal drawer.

Use restrained borders and spacing to group content. Keep the canvas quiet,
reserve the accent for links, selection and focus, and do not change font weight
on hover or selection. The article title has the full reading width; its
breadcrumb and fixed-width Copy page control sit in a separate row. Footer
links and previous/next pages remain available on phones.

Bundle Inter locally, preload its opening Latin normal face, and supply a real
italic face. Disable synthetic font styles. The desktop scale is 44px for the
page title, 28px for section headings, 18px for the introduction, 16px for prose,
and 14px for navigation and code. Phone titles reduce to 34px. Code uses the
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

Use Base UI primitives where they supply behaviour: Dialog for the mobile
menu, Collapsible for navigation sections, ScrollArea for code, and Button for
copy. Compose their parts locally in the manner of shadcn components. Keep the
existing CSS toolchain; a Tailwind migration or shared UI package needs a
separate reason. Use native links, radios, forms and disclosures where their
built-in behaviour is sufficient.

- Interactive targets are at least 44px. Hover treatments apply only to devices
  that support hover. Focus has a visible accent outline.
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
themes, no-JavaScript navigation and keyboard scrolling. Review actual browser
screenshots at desktop, tablet and phone sizes in both themes; automated layout
assertions do not establish visual quality.

See the [Website README](README.md) for commands and the
[frontend architecture](../../docs/architecture/frontend.md) for runtime and
transport ownership.
