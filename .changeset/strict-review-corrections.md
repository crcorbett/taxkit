---
"@taxkit/rules-au-pay": patch
"@taxkit/rules-au-stsl": patch
"@taxkit/analytics": patch
---

Correct cash take-home pay to deduct salary sacrifice as well as tax withholdings. Evaluate the complete PAYG coefficient formula before whole-dollar rounding, avoiding a one-dollar overcharge near half-dollar boundaries. Identify corrected pay calculations as rules-au-pay/1.0.1.

Make BackendAnalyticsLive a static Layer that reads checked settings from the host ConfigProvider. Callers now provide configuration through the native provider instead of invoking a Layer factory.
