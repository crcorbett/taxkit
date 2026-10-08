# A format field with checked return types

One operation can accept getPage({ id, format? }). Omitted format means data;
explicit markdown selects that shape. The response repeats format so a dynamic
choice narrows by checking that field. The domain owns all these definitions.

The complete checked contract and tests are in
[format-selected.ts.tmpl](../../assets/examples/format-selected.ts.tmpl) and
[format-selected.test.ts.tmpl](../../assets/examples/format-selected.test.ts.tmpl).
Copy them to a repository's existing example/test owner and run typecheck and
@effect/vitest with the qualified Effect version. They are not a new framework,
service per format, unchecked generic request helper or runtime.

HTTP uses this request's id as params and format as a query; RPC and MCP use the
same request Schema as their payload/tool input. Use native builders and error
Schemas. Generated clients return PageResponse, the complete union. Pass the
native operation to checkedGetPage inside the private client Layer; the check
then verifies the requested variant before the exact return type is promised.
The callback is confined to this named page operation and cannot choose an
arbitrary result type or expose a raw client.

The example checks missing/default, explicit and dynamic formats, the wrong
response variant, invalid reply data and ordinary tagged failures. The native
transport templates separately check error round-trips and stalled reads.
Keep native optional-field decoding defaults and tool metadata defaults aligned.
Binary variants use native Schema JSON codecs, not hand-written byte conversion.

A TanStack loader must encode a checked success/error result before returning
its plain data. HTTP/RPC Schema-tagged errors can decode to their native classes;
TanStack serialisation must not be assumed to retain thrown prototypes.
