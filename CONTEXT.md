---
document_type: domain-glossary
lifecycle: current
authority: supporting
owner: taxkit-architecture-owner
last_reviewed: 2026-10-03
review_trigger: calculation vocabulary or domain meaning changes
---

# TaxKit calculation language

TaxKit answers defined tax questions from explicit facts and supported rules.
These terms describe the existing calculation model.

## Language

**Calculator**:
A named calculation that answers a particular tax question using facts and
rules, and returns a report.
_Avoid_: mode, formula

**Fact**:
A named value used in a calculation. It may be supplied by the caller or derived
by a rule.
_Avoid_: arbitrary input, unlabelled value

**Input fact**:
A fact explicitly supplied for the circumstances being calculated.
_Avoid_: application state

**Derived fact**:
A fact produced from other facts and the applicable rules or parameters.
_Avoid_: supplied answer

**Rule**:
A defined step that derives one or more facts from accepted facts and parameters.
_Avoid_: calculator mode

**Parameter**:
A rate, threshold, table or constant that applies to a specified period.
_Avoid_: user preference

**Scenario**:
The accepted input facts and relevant dates for one calculation.
_Avoid_: saved account

**Report**:
The named results returned by a calculator.
_Avoid_: tax return, personal tax advice

**Trace**:
A record of the calculation steps and values behind a result.
_Avoid_: application log
