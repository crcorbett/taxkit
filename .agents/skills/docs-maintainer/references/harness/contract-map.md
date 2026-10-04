# Harness contract map

Use this map to load the smallest complete contract for the job. The invariant
IDs and structured artifact fields are stable across repositories. A repository
profile supplies local paths, commands, journeys, environments, and qualified
exceptions.

## Required loading

| Work                                               | Load                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Localized documentation change                     | `document-classes.md`, `change-impact.md`, and the local repository profile                           |
| Material implementation or PRD                     | `invariant-register.md`, `context-and-ownership.md`, `proof-and-evaluation.md`, and the local profile |
| Operational, provider, release, or automation work | Add `operations-and-authority.md`                                                                     |
| Repository-wide audit                              | All files in this table plus the `repo-structure` audit references                                    |
| New repository or profile change                   | Add `repository-variation.md` and validate the profile                                                |

## Fixed lifecycle

1. Establish target identity, lifecycle phase, authority, claims, exclusions,
   and stop conditions.
2. Load current semantic owners just in time.
3. Trace representative whole jobs and important boundaries.
4. Record structured findings and preserve strengths.
5. Stop for finding acceptance unless implementation was already authorized.
6. Map accepted finding IDs into SPEC requirements and tasks.
7. Implement the smallest complete slices and update semantic owners in place.
8. Prove the actual claim, record limitations and non-claims, then close or
   retain an explicit failed, blocked, deferred, no-op, or inconclusive state.

Do not replace this lifecycle with a fixed number of agents, passes, epochs, or
commands.

## Structured artifacts

The canonical field contracts live under `assets/harness/`:

- `repository-harness-profile.schema.json` — repository-specific extension
  points and qualified exceptions;
- `critical-journey.schema.json` — consumer or operator journey definition;
- `bounded-receipt.schema.json` — claim-matched observed result;
- `authority-envelope.schema.json` — consequential authority;
- `control-record.schema.json` — feedback, control, automation, and retirement.

The `repo-structure` skill owns audit scope, finding register, and accepted
finding crosswalk schemas. Markdown reports are views over those structured
records, not competing sources of truth.
