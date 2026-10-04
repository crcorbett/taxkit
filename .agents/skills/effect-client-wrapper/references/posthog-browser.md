# A PostHog browser client owned by Effect

Use this for a PostHog client in a React/TanStack application with an Effect
Atom runtime. It complements the
[app and proxy layout](../../alchemy-iac/references/effect/posthog-analytics.md)
and [Alchemy provider guide](../../alchemy-iac/references/providers/posthog.md).
Inspect the installed SDK and Effect APIs; this describes a qualified pattern,
not a version-independent implementation to paste. Apply the sibling
[strict Effect policy](../../strict-effect-ts/SKILL.md), including its named
operations, closed requirements, typed errors and narrow host exceptions.

## Contents

- [Keep the public service semantic](#keep-the-public-service-semantic)
- [Acquire, initialise and close the SDK in the Layer](#acquire-initialise-and-close-the-sdk-in-the-layer)
- [Make collection choices explicit](#make-collection-choices-explicit)
- [Respect the selected privacy controls](#respect-the-selected-privacy-controls)
- [Check the real client](#check-the-real-client)

## Keep the public service semantic

Expose checked operations such as `recordPageView(PageView)` and
`recordNavigation(NavigationUse)`, with closed typed errors and no environment
requirements escaping callers. Put event Schemas and the service in the shared
analytics owner. Keep the SDK instance, wire acknowledgements and browser access
inside the app's private `browser.adapter.layer.ts`. Never expose a raw client,
generic `capture(string, object)`, `use` callback or arbitrary properties.

Extend the existing React-mounted Atom runtime. Atom is the owner of service
lifetime and effectful actions, not a second wrapper around every SDK method.
React calls the service through the established Atom action boundary. Routes
choose event semantics; components can receive action callbacks. Do not create
a second runtime, mutable module singleton or per-click Promise runner.
Keep browser imports in the framework's matching client environment function.

## Acquire, initialise and close the SDK in the Layer

Decode enabled/disabled settings, stage and Website origin before construction.
Disabled collection returns a working no-op service and should not load the SDK.
Keep configured-off, policy-blocked and unavailable distinct. Malformed enabled
settings produce a named configuration failure; any safe downgrade belongs to
an explicit composition policy with a fixed diagnostic. Do not silently turn
all decode or acquisition errors into an indistinguishable disabled state.
Construct the browser SDK once in the scoped Layer and register cleanup before
initialisation can partly fail. Adapt synchronous SDK and browser operations
with `Effect.try`; confine import/shutdown Promise bridges to this exact adapter
with `Effect.tryPromise`. Native Effect operations need no Promise conversion.
Keep `this` bound when calling instance methods.

Apply a total acquisition deadline and bounded cleanup. Supply the Effect
cancellation signal when the SDK operation supports it. A dynamic import itself
cannot be aborted; a late module result must not initialise a client after its
scope closes. Keep construction inside the interruptible Effect continuation,
not a detached Promise callback. Cleanup also covers partial initialisation and
must not swallow defects or interruption while handling named shutdown failures.
State the limits of any SDK operation that cannot be cancelled. The cleanup
budget must include waiting for a capture permit and acquiring ownership of the
client, not only the SDK shutdown call. Test close while a capture is stalled:
close must finish within its budget, old handles must stay closed, and a later
capture completion must not send or restore the client. Choose and test an
explicit cancellation/drop policy if capture work can outlive its Layer scope;
a timeout that leaves a usable instance behind is not bounded cleanup.

Use `Ref<Option<Client>>` for scoped state, `Option.match` for presence and
`Semaphore` only where acknowledgement/state updates need serial access.
Use named `Effect.fn` for public operations and `Effect.fnUntraced` for private
helpers without a separate span. Do not manually branch on `Option._tag`,
read `.value`, assert a client exists or use ternaries to unwrap optional settings.
Coordinate capture, acknowledgement updates and close so competing calls cannot
use an instance that has been released. Match the configured mode exhaustively;
do not turn a future mode into a silent default.

Decode the SDK's capture acknowledgement with its owning Schema. It reports
client acceptance, not provider storage. Mark a page as sent only after the
client accepted it. Guard repeated effects, remounts and competing calls without
suppressing a later real navigation back to the same page.

## Make collection choices explicit

For selected events, disable SDK automatic page views and automatic clicks, then
record page views and chosen actions from their semantic owners. A custom event
can still be blocked by an analytics-domain rule when autocapture is disabled.
Turning off autocapture is not the same as disabling the SDK or changing its
delivery address.

Inspect every enabled SDK feature and its network paths. A minimal profile may
disable replay, page-leave/performance/error capture, heatmaps, surveys, tours,
feature-flag requests and external dependency loading. These are product choices,
not an instruction to disable features a user needs. Qualify actual option names
and defaults for the pinned SDK. Keep the UI host on the matching PostHog region
even when the ingestion host becomes a Website path.

Agree identity and persistence. An anonymous visitor ID can support repeat
visits without creating person profiles. Keep backend request identities separate
unless the product explicitly needs and approves linking them. Check an owned
property allowlist: short page/action names, stage, bounded campaign names and
referrer host can be useful; complete URLs, queries, bodies, cookies, auth headers,
emails and raw errors usually are not needed for these measures.

The SDK's synchronous `before_send` callback must remain synchronous. Confine it
to one private capture consumer, use the installed non-throwing Schema decoder,
and rebuild only permitted fields for known events. It must not run an Effect,
call a runtime or throw. Reject unknown events and malformed properties. Keep
transport fields such as token, distinct ID, event UUID and timestamp when the
installed SDK requires them; do not accidentally copy all enrichment fields.
Enforce this narrow callback exception with the real lint command and fixtures.
Check event-specific properties, nested values and SDK envelope fields; a brand
alone is not a length or format check. Prove that extra properties are removed,
unknown events return the SDK's drop sentinel and malformed input never throws.
This pure callback grants no general synchronous decoder exception elsewhere.
Keep value imports and SDK calls restricted to the adapter even when the
consumer needs an SDK type. Allow only type imports there; do not turn off the
whole import rule for that file. Run a negative value-import fixture at the
consumer's actual path so its specific override is exercised, alongside an
allowed type-import fixture. A rejected import in an ordinary file does not
prove that the callback override is narrow. A restricted-property override
replaces that rule's entire list: retain the Promise-bridge and throwing-decoder
bans while allowing only the non-throwing callback decoder. Test a misplaced
Promise bridge under the consumer path too.

## Respect the selected privacy controls

Honour Do Not Track when it is part of the agreed policy, both at startup and
before each capture. Consent controls are separate. Do not add or remove them
because this reference's source application made a different choice, and do not
state a legal exemption based on geography.

If collection needs consent withdrawal, discard pending SDK batches before
closing the instance. In the qualified SDK, opt-out/reset did not empty send
queues and shutdown could flush a waiting batch. Test Allow followed immediately
by withdrawal within the batch delay. Do not present opt-out followed by shutdown
as proof that waiting events are gone. If the supported SDK cannot meet the
required policy, surface that mismatch rather than bypassing its queue contract.

For a consent-free migration, change only the application's owned old-choice
keys under the user's instruction. Test both saved choices and no saved choice;
do not clear unrelated browser storage. The qualified SDK needed an explicit
queue-resume operation without an opt-in event. Inspect the target version before
reusing that workaround; ordinary SDK initialisation may behave differently.

## Check the real client

Test through deterministic Layers: disabled state, malformed configuration,
wrong origin, Do Not Track, allowed events/properties, acknowledgement failure,
duplicate suppression, timeout, interruption and scoped cleanup. Include late
import/acknowledgement, partial init failure, concurrent capture/close and repeated
Layer mount/unmount. Prove one acquisition and one release per mounted lifetime,
no capture after close, and bounded safe diagnostics. Do not replace
the imported SDK with a fake and then claim the real SDK works.

In a deliberate enabled Preview, observe a fresh browser: SDK chunk loads,
selected Home/About events, real batching, request status and stored exact UUIDs.
Check Do Not Track beyond the batching window, restore any temporary override,
and test required migrations with both old saved choices. Keep startup coverage
separate if the browser tool cannot set the value before SDK initialisation.
Closing a tab can lose waiting events; a shutdown call is not durable delivery.

Read [PostHog browser configuration](https://posthog.com/docs/libraries/js/config),
[collection controls](https://posthog.com/docs/privacy/data-collection) and the
[SDK source](https://github.com/PostHog/posthog-js), then reconcile those sources
with the pinned types and observed network behaviour.
