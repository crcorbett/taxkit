---
document_type: component-guide
lifecycle: current
authority: canonical
owner: taxkit-web-app-owner
last_reviewed: 2026-11-02
---

# UI components

The Website owns these adaptations of [shadcn/ui's Base UI components](https://ui.shadcn.com/docs/components/base).
They share native Base UI props, refs and `render` composition; feature state
and navigation policy belong to the consuming containers. Import each component
from its file, without a barrel or another provider.

## Source and adaptations

The starting sources are shadcn's `base-nova` registry, retrieved 2026-11-02:

- [Button](https://ui.shadcn.com/r/styles/base-nova/button.json)
- [Input](https://ui.shadcn.com/r/styles/base-nova/input.json)
- [Field](https://ui.shadcn.com/r/styles/base-nova/field.json)
- [Sheet](https://ui.shadcn.com/r/styles/base-nova/sheet.json)
- [Collapsible](https://ui.shadcn.com/r/styles/base-nova/collapsible.json)
- [ScrollArea](https://ui.shadcn.com/r/styles/base-nova/scroll-area.json)

The [MIT licence](LICENSE) applies to the adopted source. These are owned
components, not a runtime shadcn dependency or an unmodified CLI installation.
When adopting another component, compare its registry source and implement its
styles in the existing CSS toolchain. Do not run `shadcn add` over these files;
the upstream utility classes require Tailwind, which this app does not use.

`styles.css` expresses the shared variants, focus, disabled, sheet and scrollbar
styles in ordinary CSS. It consumes shadcn's semantic variables; the docs reader
maps those variables to the checked MDX theme. Platform colours are the default
outside a themed reader. The adapters preserve these intentional differences:

- Button supports the used default, outline and ghost variants and default,
  large and icon sizes. Targets are at least 44px. `buttonVariants` supplies the
  same styling attributes to native links without adding button keyboard behaviour.
  `data-ui-button` preserves styling when another Base UI primitive supplies its
  own `data-slot` through `render={<Button />}`.
- Input keeps Base UI's complete prop contract and a 16px font. Field is native
  layout; FieldLabel requires an explicit `htmlFor`, and consumers associate
  FieldDescription with their input using `aria-describedby`.
- Sheet exposes Portal, Overlay and Content separately. The consumer owns the
  portal container, close control and focus restoration; there is no implicit
  body portal or injected close button. Motion uses transform and opacity only,
  and respects reduced motion.
- ScrollArea exposes its Viewport so a consumer can supply a native labelled
  region and `tabIndex`. ScrollBar owns the thumb and takes the native orientation.
- Native props and React 19 refs pass through. No adapter owns feature state,
  validation, an Effect runtime or a registry.

Keep native radios, links, forms and disclosures when their browser behaviour
is useful before hydration or without JavaScript. See the
[Website design guide](../../../DESIGN.md) for those guarantees.
