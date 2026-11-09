# Agnostic MDX reading contracts and React presentation

Status: accepted

Keep document semantics, React presentation, publication policy and the Website
as separate owners. Extend the existing content-neutral design without changing
its compiled or rendered artifact formats or the docs v2 JSON shape.

- `@taxkit/mdx` owns source/document/rendered contracts, paired themes, provider
  contracts, strict artifact services and the minimal neutral reading model.
- `@taxkit/mdx-react` owns pure presentation of that model and theme. It knows
  neither Content nor a router, authored publication or application runtime.
- `@taxkit/content` owns TaxKit's publication refinements, metadata, title
  extraction, addresses, catalogue, navigation, search and link policy.
- The Website composes the page, publication data, routing, focus, outline
  observation, appearance state, clipboard commands and general UI controls.

`MdxRenderer.render` still returns checked presentation data, not React or HTML.
Providers and static Layers remain independent of the React package. A caller
can compile/render at its chosen host phase, store the checked artifact, and
present its blocks later without acquiring any provider or compiler.

## One owner for reading semantics

MDX exports `ReadingInline`, `ReadingBlock` and `ReadingBody`, plus their node
Schemas. Their fields derive from the existing neutral source/rendered models.
Reading links omit authored `target`; reading code omits redundant raw `text`.
Rendered artifacts retain those fields for textual projections and provenance.
Full rendered blocks structurally satisfy the smaller reading contract.

The owning `ConsistentTableColumns` and `UniqueHeadingIds` checks are reused
by source, rendered and reading Schemas. Copying Struct fields does not copy a
record-level check, so consumers must retain these explicit checks when
constructing narrower records or arrays.

Content reuses these Schemas and adds its actual publication rules: a nonempty
body after the title, h2–h4 body headings, canonical heading IDs and restricted
published destinations. Its existing identities are additional brands on MDX
values. One admission decode checks the genuinely narrower Content projection;
there is no per-node rebranding pass or public projection service.

The docs namespace stays v2. Historical encoded reading-body bytes, field
omission and the stricter publication constraints are covered by compatibility
tests. Strengthened TypeScript brands are recorded as a Content major change;
this does not claim that every consumer manually constructing the old types
without their owning Schemas remains source-compatible.
The OpenAPI snapshot also records inherited nonempty/whitespace checks on
heading IDs and links; the existing publication patterns already imply both.

## Presentation interface

The React package has explicit body, code-block, theme, Schema and stylesheet
entries. Components receive readonly checked values and return elements.
They do not decode props, run Effects, load providers or create state registries.

`MdxBody` has two named presentation slots: `Link` and `Code`. They substitute
the host's navigation and code toolbar while preserving the closed document
grammar. They are not an authored JSX registry or arbitrary component mechanism.
Native anchors and the neutral code view work without host adapters.

`MdxCodeBlock.renderToolbar` supplies its exact whitespace-preserving text and
language label. The Website binds those values to its existing Effect Clipboard
command. Code and tables share private Base UI/shadcn scroll parts, including
labelled focusable viewports and native no-JavaScript fallbacks.

`MdxTheme` formats the checked theme, shared fonts and appearance. The host
loads fonts and chooses/persists appearance. Optional native radio markers in
a designated direct controls child preserve pre-hydration/no-JavaScript mode
selection. The same CSS selects token appearances and embedded SVG media schemes.
Native `@scope` bounds appearance-specific token rules at each reading container,
so an outer dark reader cannot override the font styles of an inner light reader.
No extra runtime, registry, mutable service or Layer factory is introduced.

Content styles belong to the presenter. Page grids, sticky headers, navigation
selection, branding, search, loading/recovery wording and page actions remain
Website-owned. CSS custom properties expose narrow layout integration such as
the scroll margin below a host's sticky header.

## Enforcement

Workspace import rules prohibit reverse dependencies: MDX imports no other owned
package, the React presenter imports only MDX among owned packages and no
router, Pele remains independent, and the diagram adapter imports only MDX and
Pele. Browser code may import only the presenter's public entries; parser,
highlighter and provider modules stay out of the browser.
