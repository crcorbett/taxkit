# @taxkit/webmcp

Private compiled package that registers the Website's calculator page tools
with the browser's WebMCP host (`document.modelContext`). The tools themselves,
their handlers and their failure belong to
[`@taxkit/calculators`](../calculators/README.md); the Website composes them for
a mounted page.

- `./service` exports `ModelContextHost`, whose `registerTool` lasts for the
  enclosing Scope, and `WebMcpSite`, the Website origin allowed to register.
- `./host` exports `ModelContextHostLive`, the one WebMCP Promise bridge. It
  detects the host lazily, keeps the host object as the method receiver,
  registers only on the matching Website origin, and gives each registration a
  two-second deadline. Closing the Scope aborts the registration and
  interrupts any running call.
- `./registration` exports `registerCalculatorPageTools`. Each tool advertises
  its checked parameter Schema; Toolkit decodes the input and encodes the
  result. Any failure becomes an encoded `CalculatorToolFailure`, never a
  rejected Promise or a Cause. A refused tool is logged and the others still
  register.
- `./schemas` exports `WebMcpTool` and `WebMcpRegistrationError`, whose reason
  is the host's `DOMException` name, `registration-timeout` or
  `unexpected-host-refusal`.

A browser without WebMCP, and server rendering, register nothing.
