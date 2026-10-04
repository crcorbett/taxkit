---
"@taxkit/infrastructure": major
---

Make exported documentation build-cache settings readonly, including nested
workspace arrays. Callers passing them to a provider that expects writable
arrays must first copy those arrays. The stack now passes fresh copies while
preserving the resource settings and cache inputs.
