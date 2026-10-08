# TaxKit API

## Unreleased

- Accept zero taxable income in the existing annual nil-rate band.

### Patch Changes

- Annual reports now identify `rules-au-income-tax/1.0.1`. The single-person
  2025–26 Medicare thresholds are corrected to $28,011/$35,013, with the enacted
  source and boundary tests; affected lower-income answers change. Other tax
  components and pay rules retain their results.
- Invalid present `API_PORT` values now fail with a safe settings error rather
  than silently using `PORT`. Normal defaults and valid overrides remain.
- Public-route smoke checks cover complete request deadlines, the OpenAPI
  calculate path and checked external-consumer evidence. Cancellation and
  timeout stop the child processes; failed temporary-folder cleanup fails the
  command and remains alongside earlier failures.

### Major Changes

- Calculation responses now expose the independent exact ruleset identifiers
  `rules-au-pay/1.0.0` and `rules-au-income-tax/1.0.0`. Calculator field errors
  keep their tagged shape, normalized paths and descriptor help while no longer
  echoing rejected values in issue messages.

## 1.0.0

### Major Changes

- Renamed API runtime configuration to the `TAXKIT_` environment prefix and
  the local development endpoint to `https://api.taxkit.localhost` as part of
  the TaxKit identity cutover. Public HTTP route paths, request schemas and
  response schemas are unchanged.

## 0.0.1

### Patch Changes

- Added `POST /api/v1/calculators/:calculatorId/calculate` for public
  calculator execution across take-home pay, PAYG withholdings and annual
  income tax, with schema-guided fact decode errors.
- Added public calculator metadata routes for jurisdictions, tax years,
  calculator discovery, calculator schema metadata, graph diagnostics, facts
  and rules.
- Added the standalone Bun API runtime for the public TaxKit HTTP surface.
- Added public API documentation routes for the initial health-check contract:
  `GET /api/docs` and `GET /api/docs/openapi.json`.
- Added `GET /api/health` as the initial API availability endpoint.
