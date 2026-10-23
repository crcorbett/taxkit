---
"api": patch
---

The API build now builds the documentation catalogue ahead of time. It reads
the authored MDX with `@taxkit/mdx` and `@taxkit/diagrams` and writes the checked
catalogue to JSON, which the Worker decodes in about 10 ms when an isolate
starts. Previously a new isolate parsed every page, highlighted code and drew
diagrams on its first request, adding about a second to calculator and docs
requests alike. The parser, highlighter WebAssembly and Mermaid renderer leave
the Worker bundle. `pr:plan`, `production:plan` and `pr:destroy` build the API
first.
