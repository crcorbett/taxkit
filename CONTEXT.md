---
document_type: domain-glossary
lifecycle: current
authority: supporting
owner: taxkit-architecture-owner
last_reviewed: 2026-10-13
review_trigger: calculation, public content vocabulary or domain meaning changes
---

# TaxKit calculation and publication language

TaxKit answers defined tax questions from explicit facts and supported rules.
These terms distinguish its calculation model from information intended for
everyone who reads the published site.

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
_Avoid_: application log, request timing

**Public calculator metadata**:
Descriptions of TaxKit's supported calculators, periods, fact definitions and
rules. It contains no person's input facts, reports or calculation traces.
_Avoid_: personal facts, calculation results

**TaxKit publication address**:
The main public address named by TaxKit's published pages and discovery
documents. It identifies the published site even when a page is viewed in a
separate Preview.
_Avoid_: current Preview address, API endpoint address

**TaxKit operational observation**:
A record about a TaxKit request or host, such as its stage, route, duration or
safe error name. It contains no salaries, input facts, results or calculation
traces.
_Avoid_: calculation trace, calculation report
