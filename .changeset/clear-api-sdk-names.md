---
"@whattax/http-api": patch
"@whattax/sdk": patch
---

Rename calculator API and SDK Effect report helpers to clearer public names,
and add an SDK Effect full-run helper that returns typed calculator run
responses. The HTTP calculate route now delegates full-run execution through
that SDK helper.
