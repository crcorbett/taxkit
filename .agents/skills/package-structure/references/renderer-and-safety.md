# Renderer and safety

`render_package.py` accepts a kind, an absolute new target, a valid scoped
package name, a source condition, a JSON version snapshot, and—when needed—an
existing domain package name.

It refuses relative paths, lexical traversal, filesystem/home/repository roots,
existing targets, symlinked parents/assets, invalid names, and missing aligned
Effect v4 versions. It renders in a sibling staging directory, validates, writes
`package-structure.render.json`, then atomically renames. Failure removes the
staging directory. There is no force option.

The source condition must be a custom name such as `@scope/source`, not an
empty, malformed or standard condition such as `types`, `default` or `node`.
Every compiled export keeps that recorded condition first and points it at an
existing source file. Repository and package receipts must agree on the name.

The version snapshot must contain an ISO date and an exact `effect` version.
Templates target DAW's qualified Effect `4.0.0-rc.117` API, including
`Schema.TaggedError`. The renderer accepts current v4 RC/stable snapshots and
has no legacy API switch. A different selected release needs qualification of
the canonical templates before adoption.
Network resolution belongs to repository snapshot maintenance, never rendering.
The render manifest records the snapshot date and content digest, never the
absolute installation or source path.

Use an isolated temporary directory for smoke tests. Do not point the renderer
at a dirty live package; audit and patch that package deliberately instead.
