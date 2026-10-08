# Browser and Web Platform

## Browser boundary

Compose a browser-safe runtime from:

- typed HTTP/RPC client;
- browser Config that contains no server secret;
- scoped storage/cache services;
- browser logging/tracing;
- DOM/Web API adapters required by the application.

Never import server/provider/filesystem Layers into the browser graph.

## DOM events

Treat event listeners as scoped subscriptions or Streams when they drive effectful work.

- decode event target/value;
- bound rapid input with debounce/throttle using Effect time;
- encode cancellation on unmount/navigation;
- remove listeners in a finaliser;
- avoid global event buses;
- apply backpressure where events can outpace consumers.

Simple synchronous local UI updates may stay in the framework/DOM layer.

## Fetch and cancellation

Use a browser Effect HttpClient Layer or typed RPC service. Connect AbortSignal/navigation cancellation to Effect interruption and close response bodies.

Do not call raw fetch across components/modules. Do not implement retry simultaneously in Effect and a client cache/query library without choosing one owner.

## Storage

Wrap localStorage, sessionStorage, IndexedDB, Cache Storage, and cookies in semantic services.

- Schema-encode writes and decode reads;
- version durable values;
- distinguish missing from invalid;
- define quota/permission failure;
- avoid secrets and sensitive provider tokens;
- handle cross-tab consistency;
- invalidate or migrate old versions;
- keep storage unavailable/private-mode behaviour typed.

Do not treat localStorage as a trusted domain object store.

## Workers

Model Web Workers and Service Workers as separate host runtimes with encoded message protocols.

- Schema-decode every message;
- use tagged request/result envelopes;
- correlate and cancel requests;
- scope ports/listeners;
- bound queues and payload size;
- handle worker restart/version mismatch;
- never pass services, Causes, class instances, or mutable objects across the boundary.

Service Worker caching and offline policy require explicit ownership and versioning.

## WebSocket, SSE, and streams

Use scoped Stream/Channel adapters:

- connection acquisition/release;
- frame Schema;
- heartbeat/reconnect Schedule;
- backpressure/buffer policy;
- authentication refresh;
- interruption;
- duplicate/order semantics.

Do not call a buffered response streaming. Prove early delivery and resource cleanup.

## Time, randomness, and crypto

Use Clock and injected randomness/identifier services for domain semantics. Use Web Crypto only through a narrow typed adapter when cryptographic operations are required; never substitute ordinary Effect Random for security-sensitive key/token generation.

Keep cryptographic keys non-extractable/redacted where the platform supports it and never log encoded key material.

## Permissions and capability APIs

Wrap clipboard, geolocation, notifications, media, and similar APIs in named services. Model denied, prompt, unavailable, cancelled, and invalid-result states. Acquire/release media tracks and subscriptions with Scope.

Do not trigger permission prompts as import/render side effects.

## Tests

Use controlled Layers and a browser environment for event cleanup, abort propagation, protocol codecs, storage versioning, worker restart, reconnection, and permission states. Keep network/provider tests separately opt-in.
