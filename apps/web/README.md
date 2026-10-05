---
document_type: app-readme
lifecycle: current
authority: canonical
owner: taxkit-web-app-owner
last_reviewed: 2026-10-05
review_trigger: website rendering, settings, transport, form, generated types or build change
---

# Website app

`apps/web` is the native TanStack Start Website candidate. Its first form uses
native Effect RPC to calculate Australian take-home pay. Tax calculation stays
in the separate API app. The current public docs app remains `apps/docs`.

## What runs where

The server has one `ManagedRuntime` in `src/lib/runtime.server.ts`. Its checked
`WebsiteServerApplication` exposes settings and calculation only. The private
`TAXKIT_API` service binding supplies the server connection. The native Alchemy
Fetcher adapter keeps the binding's receiver attached.

The root route restores Schema-encoded settings and seeds a React-owned Atom
registry. `calculator.atoms.ts` describes the browser connection and commands;
it creates no browser runner. Checked settings stay alive for that registry's
lifetime, including time spent waiting before the first click. The browser calls
the checked `API_PUBLIC_ORIGIN` directly at POST `/rpc`. The server function
transports settings only. No calculation runs when the page loads.

Calculate sends the existing canonical request. Editing interrupts unfinished
work and clears the previous answer. Leaving the form interrupts its operation;
disposing the registry releases its resources. The standard HTML POST form also
works without JavaScript, using the private binding and the same API operation.
Server submissions use an encoded checked result when TanStack loads the page
in the browser. Neither an Effect Context nor a service binding is serialised.

The shared RPC client owns its receive-loop scope per calculation. Retaining a
client started by an earlier Worker request can stall a later request. Its
transport Layer keeps configuration, and each call creates and releases the
native RPC client without building a Layer or runner. Both RPC and HTTP tracing
are disabled for this connection; HTTP tracing otherwise adds headers outside
the admitted browser CORS policy. This is containment, not completed tracing.

## Settings and generated owners

Alchemy's apps graph supplies `API_PUBLIC_ORIGIN`, `WEBSITE_PUBLIC_ORIGIN` and
`TAXKIT_API` from the matching native resources. Origin Schemas admit HTTPS or
local HTTP origins and reject paths, queries, fragments and credentials. Config
reads semantic strings; Schema checks the native binding object separately.
Expected settings errors use fixed safe fields. No guessed production address
or browser build-time origin is used. Automatic Vite env-prefix exposure is off.

`wrangler.jsonc` owns the standalone local fixture and compatibility settings.
Its local names and addresses are test inputs, not deployed resources. Wrangler
owns `src/worker-runtime.generated.d.ts`; regenerate it rather than editing it.
TanStack owns `src/routeTree.gen.ts`.

## Checks

```sh
bun run --filter=web generate:worker-types
bun run --filter=web check:worker-types
bun run --filter=web check-types
bun run --filter=web test
bun run --filter=web test:browser
bun run --filter=web build
bun run --filter=web build:native-pair
bun run --filter=web test:native-pair
```

`build:native-pair` first builds compiled RPC dependencies, then uses Alchemy's
public native source builders for both apps. The Website declares `api` as a
workspace development dependency because this local builder resolves
`api/worker`; a stray root link cannot stand in for that declaration.
It acquires no cloud provider,
state, plan, credentials or apply. The API output is ignored under
`.alchemy/native-pair`; the native Website output is `dist/server/server.js`.
A standalone Cloudflare Vite build instead produces `dist/server/index.js`.
Run the native build immediately before its test, because a normal build
replaces that Website output.

The native pair test requires the selected Node 24.16.0 and installed Chromium.
It owns local ports 4196 and 4197 and disposes its browser and Workers on exit.
The public API and private binding use separate local isolates built from the
same API artifact. The test covers an initial page, repeated private requests
across idle time, one exact browser POST, omitted cookies/tracing headers,
editing, and a calculation without JavaScript. It does not prove deployment,
provider cancellation or every failure/trace-export path.

The Atom/Scheduler browser checks cover scheduling, StrictMode remount,
hydration, rapid updates, editing and form unmount cancellation, and expected
server-error restoration without replaying a calculation. Effect scopes own
fixture cleanup. Exact lint admissions cover required execution, encoding,
native binding input and Playwright's `fill` operation; nearby application
files retain the restrictions. Both Knip graphs include the Website.

`dev` runs the standalone native Website fixture. A matching native API service
must also be registered for its private binding; the retained Bun HTTP process
alone cannot supply it. The complete development pair and all calculator pages
remain active clean-slate work.

## Related owners

- [Frontend architecture](../../docs/architecture/frontend.md)
- [RPC package](../../packages/api/rpc/README.md)
- [API app](../api/README.md)
- [Native apps graph](../../packages/infrastructure/README.md)
- [Active execution plan](../../docs/exec-plans/active/clean-slate-foundation.md)

Retained 2025–26 results are unchanged. The Medicare decision, remaining
calculator pages, full native failure/privacy qualification and safe exported
telemetry remain separate unfinished tasks.

The settings server function accepts GET without query data or client Context.
The shared explicit route base is configured in Vite and checked at Worker
ingress. The native function's generated URL is the exact admitted address;
unknown IDs, extra path parts and missing IDs get empty 404 before framework
lookup/logging. Unexpected payloads get empty 400 responses; unsupported methods get
empty 405 with `Allow: GET`. Unexpected internal settings failures pass through
the native HTTP matcher and fixed host reporter before TanStack serialisation.

The native builder also compiles a controlled `PRIVATE9` settings defect into
ignored `.alchemy/native-pair/settings-defect/server`. An Effect scope restores
the source byte-for-byte before rebuilding the ordinary pair. Do not run this
builder concurrently with source scans or tests that replace source files.
The fault test requires the injected operation in the actual artifact, empty
500 response, positive fixed log event and no marker in logs or replies.

The same builder also creates controlled API failure artifacts from the actual
API entry: a real calculation followed by an unexpected defect, and one damaged
report field after native reply encoding. Scoped finalisers restore the entry
byte-for-byte before the ordinary build. Fresh owned output and reached-response
checks prevent an old bundle from standing in for the injected operation.

The native RPC failure test uses ports 4199 and 4200. Real Workers check malformed
JSON, unknown procedures/envelopes, invalid identities, excess properties and
bounded batches, plus procedure decoding, version disagreement and expected
calculator rejection. The fatal reply retains its native defect identity and
fixed safe message; the Website returns empty 500 through the private binding.
A damaged valid-JSON reply becomes the checked invalid-response error. Its real
Worker-produced HTML loads in Chromium; editing clears the restored error
without replaying a calculation, proving the browser has taken over the form.
Actual fixed API/Website log events must be present and omit the short marker
and pay values. These are local observations; exported telemetry and complete
cancellation remain unfinished.
