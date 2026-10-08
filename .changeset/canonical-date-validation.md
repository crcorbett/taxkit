---
"@taxkit/core": patch
---

Enforce DateInterval start-before-end validation in its canonical Schema as well as the convenience constructor. Consolidate ISO date validation and use checked month lookup; invalid constructors now raise the owning Schema validation `Error` with its issue cause instead of a custom diagnostic. Keep valid date, AUD arithmetic and calculator results unchanged.
