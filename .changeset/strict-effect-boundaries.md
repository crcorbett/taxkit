---
"taxkit": major
---

Make Schema class identities nominal across the SDK and align its Effect dependencies with the latest release verified against Alchemy. Code that supplied structural stand-ins for Schema classes must use the owning constructors or decoders instead.

Keep existing runtime exports, namespace type members, JSON representations and Promise-returning plain SDK calls. Plain clients now own an explicit Effect scope that is closed by `dispose()`. Public entry points use explicit exports, with compatibility entries retaining the published rule and calculator Schema namespaces.
