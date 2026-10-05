---
document_type: app-readme
lifecycle: current
authority: canonical
owner: taxkit-web-app-owner
last_reviewed: 2026-10-05
review_trigger: website rendering, settings, transport, form, generated types or build change
---

# Website app

`apps/web` is the native TanStack Start Website candidate. Its calculator pages use
native Effect RPC for the three supported Australian 2025–26 calculators. Tax calculation stays
in the separate API app. The current public docs app remains `apps/docs`.

## What runs where

The server has one `ManagedRuntime` in `src/lib/runtime.server.ts`. Its checked
`WebsiteServerApplication` exposes settings, the supported catalogue and calculation. The private
`TAXKIT_API` service binding supplies the server connection. The native Alchemy
Fetcher adapter keeps the binding's receiver attached.

The root route restores Schema-encoded settings and seeds a React-owned Atom
registry. `calculator.atoms.ts` describes the browser connection and commands;
it creates no browser runner. Checked settings stay alive for that registry's
lifetime, including time spent waiting before the first click. The browser calls
the checked `API_PUBLIC_ORIGIN` directly at POST `/rpc`. The server function
transports settings and the checked catalogue. No calculation runs when the page loads.

Calculate sends the existing canonical request. Editing interrupts unfinished
work and keeps the previous successful answer with an out-of-date message.
A failed retry or invalid form keeps that answer visibly out of date; only a
successful explicit calculation updates it. A previous request error is hidden
while a new request is running. Leaving the form interrupts its operation;
disposing the registry releases its resources. The standard HTML POST form also
works without JavaScript, using the private binding and the same API operation.
Server submissions use an encoded checked result when TanStack loads the page
in the browser. Neither an Effect Context nor a service binding is serialised.

The take-home result leaf shows the answer first and uses native `details` for
its pay breakdown, assumptions, supported year and source references. Amounts,
pay period, threshold choice and sources come from the checked report and its
recorded withholding trace, not the currently edited form. This keeps an old
answer's explanation consistent while it is out of date. Source references
become links only when they are valid HTTPS addresses; other citations remain
text. The container owns calculation commands; result rendering creates no
browser client, cache or tax calculation.

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

From the repository root, `bun run dev` starts the native API and Website
pair. `alchemy.apps.local.run.ts` admits only local development at the named
`dev_native_apps` stage (and `dev_native_apps_proof` for the saved test).
Alchemy prints the two addresses, binds the private API and supplies the public
origins. It uses local state and `.alchemy/native-apps-auth`, without an ambient
env file or cloud login. Ctrl-C stops the pair. Source changes in either app
reload automatically; shared-package changes require the owning package build
because the API bundler reads compiled dependency exports.

The Website Vite config reads a fresh ConfigProvider when Alchemy injects its
native plugin flag, so it does not add a second Cloudflare plugin. Server code
imports the supported runtime-only `alchemy/Cloudflare/Bridge` export, keeping
SDK development tools out of the Worker bundle. Bun's inherited source options
select the API source across Alchemy launcher processes. The root pins workerd
at the app-compatible version for both the native SDK and standalone fixtures.

`bun run --filter=web dev` remains the standalone Website fixture. It needs a
matching native API binding; the separate Bun HTTP process cannot supply that
binding. The saved native suite also starts the real CLI pair with an isolated
empty profile directory, reads its actual addresses, checks browser validation
before live edits, restores both sources exactly, and verifies calculations
with and without JavaScript plus closed app ports after shutdown. Do not run
it beside another development process in this checkout: both watch the same
sources. Full exported telemetry and complete package/transport qualification remain active work.

## Related owners

- [Frontend architecture](../../docs/architecture/frontend.md)
- [RPC package](../../packages/api/rpc/README.md)
- [API app](../api/README.md)
- [Native apps graph](../../packages/infrastructure/README.md)
- [Active execution plan](../../docs/exec-plans/active/clean-slate-foundation.md)

Retained 2025–26 results are unchanged. The Medicare decision, complete package/transport
qualification and safe exported telemetry remain separate unfinished tasks.
T003's local connection, failure/cancellation and disabled-platform acceptance
is recorded in the [acceptance review](../../docs/documentation-audit/clean-slate-foundation/2026-10-05-native-connection-acceptance-review.json).

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
and pay values. These are local observations; exported telemetry remains unfinished.

The native cancellation test uses ports 4201–4203. Two controlled API artifacts
first run the real calculation and native reply encoder, then delay headers or
the rest of that same reply for eight seconds. The generated client must reach
its five-second deadline in both cases. Chromium must abort its unfinished
request after the deadline, on editing, and when browser Back leaves the form.
These checks establish caller and browser cancellation. They do not establish
that the upstream Worker stops its artificial delayed response.

The native log checks compare pay values against emitted messages. Numeric
Worker timestamps can coincidentally contain a pay value; they are metadata,
not an emitted pay message. Private text markers remain checked across the
whole log record. The [dated cancellation receipt](../../docs/documentation-audit/clean-slate-foundation/2026-10-05-native-cancellation.json)
records source-removal checks, restoration and the remaining
exported-telemetry work.

The native graph and standalone `wrangler.jsonc` explicitly disable platform
invocation logs, stored logs and traces, with zero sampling. This protects the
candidate while safe exports remain unqualified in T009. Saved real CLI state
must contain the disabled policy for both apps; this is local desired-state
proof, not a provider upload or exported-data observation.

The saved development test uses the non-polling file watcher used by Linux CI.
It separates the first visible page edit from exact source restoration by
100 milliseconds because the pinned Vite watcher suppresses repeat file-change
events within 50 milliseconds. It still requires both visible page updates;
the original 15-second observation deadlines remain unchanged.


## Calculator routes

The root takes its navigation names, identities and year from the API catalogue.
Take-home pay stays at `/`; `/calculators/au.pay.withholdings` and
`/calculators/au.income-tax.annual` have independent form and answer state.
The root restores only encoded transport. The additional route selects the
expected checked report and saved form for its calculator;
the container seeds the checked saved form once with `useAtomInitialValues`
and owns commands/cancellation. Focused readonly leaves show the form/report.
The root registry seeds settings only; a later form restoration must not depend
on its first-render-only initial values. A saved submission checks its identity, form and successful
report together before restoration. Standard HTML POST uses the selected
canonical calculator and same private connection at each page address.

The React page retains its atom-family description while mounted.
Controls have visible keyboard focus and a skip link to the single main landmark. That family
uses weak references; holding only one member does not retain its grouping
object. It describes state and work only, without a cached client or answer.
The registry still owns values and execution.

The withholding and annual explanations use returned ledger components and
sources. Annual subtractive offsets are labelled as reducing the total; the
zero minimum is shown separately. Annual pages visibly state that retained
Medicare thresholds await Cooper's correction decision. No tax rule changes
or current-law correctness claim is made.

The developer link opens the native API documentation. `/agents` links to the
actual OpenAPI description and calculator list. Remote MCP, discovery content
and accepted publication remain later tasks; this page does not claim they exist.
