---
"@taxkit/sdk": major
"@taxkit/docs-content": patch
---

Plain SDK clients now own their resources. Await `client.dispose()` when finished;
closing cancels pending work and returns stable public errors for later calls.
Direct calculation helpers clean up automatically. Client report types remain
specific to the selected descriptor, and the SDK declares its core runtime
dependency for packed installations. Update integration examples to close clients.
