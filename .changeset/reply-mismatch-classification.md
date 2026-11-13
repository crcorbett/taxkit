---
"web": patch
---

Treat an API reply that does not match its declared Schema as a server fault (`ApiReplyMismatch`, HTTP 500) instead of an outage. Only an unanswered request or a 5xx reply without its declared body still reports the API as unavailable.
