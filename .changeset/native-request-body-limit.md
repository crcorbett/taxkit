---
"@taxkit/api-rpc": major
---

Reduce the shared native POST body limit from one MiB to 64 KiB. Use the same
byte limit for the streamed reader and native RPC message admission, preserving
source cleanup and the five-second body-read deadline. Native API and Website
hosts reject oversized bodies before decoding; exactly 64 KiB remains allowed.
