---
"@taxkit/docs-content": patch
---

Move the four checked public integration templates and their compiler/runtime
checks to the private `@taxkit/docs-examples` workspace. Use
`bun run --filter=@taxkit/docs-examples check-examples` for those templates.
Declare the existing React catalog dependency needed by the installed Fumadocs
processed-Markdown compiler; dependency versions and calculation results are
unchanged.
