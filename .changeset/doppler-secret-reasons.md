---
"@taxkit/infrastructure": minor
---

`SecretSourceError` carries a closed `reason` (`unauthorized`, `not-found` or
`unavailable`) classified from the native Doppler error tags, without copying
the token, selection or provider message.
