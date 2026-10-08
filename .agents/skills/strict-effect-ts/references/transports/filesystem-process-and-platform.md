# Filesystem, Processes, and Platform Services

## Use platform services

Use the installed Effect Platform implementation for:

- filesystem reads, writes, streams, metadata, and watching;
- path construction and normalisation;
- command/child-process execution;
- terminal and standard input/output;
- environment/config adapters;
- runtime-specific services.

Keep Bun/Node/Deno/platform APIs inside the platform Layer or a narrow host adapter. Domain services depend on semantic capabilities, not `node:fs`, `Bun.spawn`, or `process`.

## Filesystem boundaries

For every read:

1. accept a decoded path or domain identifier;
2. constrain allowed roots where input is untrusted;
3. acquire/stream through the platform service;
4. enforce size bounds;
5. decode contents with Schema;
6. map filesystem and codec failures separately;
7. close handles through Scope.

For every write:

- encode content first;
- choose overwrite/create-exclusive/append deliberately;
- write atomically through a temporary sibling plus rename when required;
- define permissions;
- sync/durability only when the domain requires it;
- read back or hash when a durable proof claim is made.

Do not use unchecked `JSON.parse` after a raw read.

## Paths and URLs

Use the platform Path service for paths and URL for URL semantics. Do not concatenate separators manually. Resolve relative paths against an explicit package/repository/application root, not the ambient current directory unless the CLI contract says so.

Reject traversal outside an allowed root. Do not emit absolute workstation or runner paths in portable receipts.

## Commands and child processes

Expose semantic operations such as `buildSite`, `readCloudflareInventory`, or `runFormatter`, not arbitrary shell execution.

Define:

- executable and fixed/decoded arguments;
- working directory;
- bounded redacted environment;
- stdin policy;
- stdout/stderr streaming and size limits;
- exit-code mapping;
- timeout/interruption;
- process-group/child cleanup;
- secret redaction before logs or errors.

Never construct a shell command by interpolating untrusted input. Prefer direct argv execution.

## Streaming output

Use Stream for incremental stdout/stderr. Preserve chunking, backpressure, interruption, and early pipe close. Collect only when the output contract is bounded.

Keep machine-readable stdout separate from structured diagnostic logging in CLI programs.

## File watching

Treat watchers as scoped Streams/subscriptions:

- define coalescing/debounce using Effect time;
- handle rename/delete/recreate;
- bound event queues;
- close watcher on interruption;
- re-decode changed files;
- avoid global watcher state.

## Errors

Map platform failures into tags that support decisions:

- not found;
- permission denied;
- already exists/conflict;
- invalid content;
- process start failed;
- non-zero exit;
- stream closed early;
- timeout/interruption;
- output too large.

Keep sanitised relative path, operation, exit code, and bounded detail. Exclude environment values and raw unbounded output.

## Tests

Use in-memory/temporary scoped filesystem or controlled platform Layers. Test traversal, bounds, atomic writes, interruption cleanup, exit mapping, stream behaviour, redaction, and relative receipt paths. Do not shell out to live providers in unit tests.
