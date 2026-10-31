---
"taxkit": major
---

Make Schema class identities nominal across the SDK and align its Effect dependencies with the latest release verified against Alchemy. Code that supplied structural stand-ins for Schema classes must use the owning constructors or decoders instead.

Remove the `CalculatorSchemas`, `PayRules`, `IncomeTaxRules` and `StslRules` compatibility namespaces. Import calculator execution and metadata Schemas by name from `taxkit/schemas`, and Australian fact Schemas and parameter contracts from `taxkit/au`. The calculator package also removes its deprecated `PublicCalculation*`, `PublicApiError` and `PublicCalculatorError` aliases in favour of `CalculatorRun*` and `CalculatorServiceError`.

Encoded JSON representations and Promise-returning plain SDK calls retain their existing behaviour. Plain clients now own an explicit Effect scope that is closed by `dispose()`. Public entry points use explicit named exports.
