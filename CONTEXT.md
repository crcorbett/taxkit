# TaxKit calculation and publication language

TaxKit answers defined tax questions from explicit facts and supported rules.
These terms distinguish its calculation model from information intended for
everyone who reads the published site.

## Language

**Money**:
A signed amount in a stated currency, expressed in whole minor units. TaxKit
currently calculates in Australian dollars, whose minor unit is the cent.
_Avoid_: unlabelled number

**Non-negative money**:
Money whose amount is zero or greater. This restriction belongs to a particular
input or outcome; adjustments can be signed.
_Avoid_: positive money (when zero is accepted)

**Calculator**:
A named calculation that answers a particular tax question using facts and
rules, and returns a report.
_Avoid_: mode, formula

**Fact**:
A named value used in a calculation. It may be supplied by the caller or derived
by a rule. Gross pay and taxable pay are distinct facts even when their amounts
happen to be equal.
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

**Rule pack**:
A named composition of rules and parameter editions for a particular
jurisdiction, tax year and supported scenario.
_Avoid_: module, plugin

**Parameter**:
A rate, threshold, table or constant that applies to a specified period.
_Avoid_: user preference

**Scenario**:
The accepted input facts and relevant dates for one calculation.
_Avoid_: saved account

**Calculation context**:
The jurisdiction and tax year selecting a calculator's edition. An effective
date is a separate dimension when a rule requires it.
_Avoid_: application context

**Calculation run**:
One execution of a calculator for a scenario and context, including its report,
edition metadata and diagnostics.
_Avoid_: report (when referring to the complete execution)

**Calculation caller**:
A person or program requesting a TaxKit calculation. The caller may supply
facts describing someone else's circumstances.
_Avoid_: taxpayer, calculation subject

**Shared calculation allowance**:
One allowance for calculation requests from the same network address across
the Website, public API and remote tools.
_Avoid_: per-interface allowance

**Report**:
The named results returned by a calculator.
_Avoid_: tax return, personal tax advice

**Trace**:
A record of the calculation steps and values behind a result.
_Avoid_: application log, request timing

**Source artifact**:
Preserved evidence for an official parameter edition, including its source,
retrieval date, extraction details and checksum.
_Avoid_: compatibility data

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
