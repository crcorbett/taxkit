# Harness invariant register

Use these IDs in audits, SPECs, tasks, controls, and receipts. A repository may
mark an invariant not applicable with evidence; it may not silently redefine
one.

| ID                  | Invariant                                                                                                                            | Required evidence                                                                  | Typical failure                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `HC-OUTCOME-001`    | One primary trajectory owns the accepted whole-job outcome through integration, proof, delivery, and closure.                        | Named owner, accepted outcome, boundaries, closure receipt                         | Parallel activity without an integration owner          |
| `HC-CTX-001`        | Each claim has one earliest semantic owner.                                                                                          | Owner map and retired duplicate pointers                                           | README, skill, plan, and architecture all state policy  |
| `HC-CTX-002`        | Context is loaded just in time from current owners.                                                                                  | Router, lifecycle classification, bounded deep-read list                           | Whole archive or stale plan loaded by default           |
| `HC-REPO-001`       | The repository teaches one coherent continuation.                                                                                    | Accepted pattern in code, types, tests, examples, and enforcement                  | Old and new patterns remain equally plausible           |
| `HC-BOUNDARY-001`   | Untrusted values decode once at ingress and encode at outward boundaries.                                                            | Owning Schema, adapter, tests                                                      | Raw primitives or unchecked SDK output flow inward      |
| `HC-TOOL-001`       | A material tool supports discovery, invocation, interpretation, recovery, repair, and real-system verification.                      | Terminal receipt and recovery route                                                | Green wrapper masks partial or failed work              |
| `HC-DOC-001`        | Architecture, standards, READMEs, skills, runbooks, proof, plans, and archives own distinct claims.                                  | Document classification and route checks                                           | Skill copies a runbook or proof becomes policy          |
| `HC-PROOF-001`      | Proof matches the artifact, boundary, environment, journey, and claim.                                                               | Bounded receipt and critical-journey oracle                                        | Unit test claimed as production proof                   |
| `HC-AUTH-001`       | Capability, identity, authority, approval, and external actuality remain separate.                                                   | Authority envelope, approval receipt, readback                                     | Tool access treated as permission to mutate             |
| `HC-FEEDBACK-001`   | Repeated findings improve the earliest durable owner and retire weaker reminders.                                                    | Control record, fixture, retirement target                                         | More prose added after every recurrence                 |
| `HC-AUTO-001`       | Continuous work is admitted only for a settled, observable, bounded, recoverable loop.                                               | Control record with signal, state, convergence, proof, stop, rollback, escalation  | Exploratory judgment automated                          |
| `HC-DEPENDENCY-001` | Material dependencies and replacements have capability, trust, upgrade, incident, removal, and lifetime owners.                      | Dependency decision and compatibility proof                                        | Local replacement silently inherits unowned obligations |
| `HC-EPOCH-001`      | Claims about worker or harness effectiveness are bound to model, host, tools, runtime, skills, target, authority, and context epoch. | Epoch identity and comparable scenario                                             | Old qualification applied to a changed worker           |
| `HC-METRIC-001`     | Effectiveness measures accepted outcomes and human attention, not activity.                                                          | Worker duration, feedback latency, synchronous attention, time to accepted outcome | Files, tokens, agents, or passes treated as success     |
| `HC-EVIDENCE-001`   | Failed, blocked, deferred, superseded, no-op, and inconclusive work remains identifiable outside the default route.                  | Provenance, receipt, successor or resume trigger, non-claims                       | Raw experiments deleted or preloaded forever            |
| `HC-LIFETIME-001`   | Every new control or artifact has an owner, carrying cost, review trigger, retirement condition, and disconfirming evidence.         | Control record                                                                     | Permanent scaffolding with no removal path              |

## Repository engineering invariants

Apply these where TypeScript, Effect, external clients, packages, or React are
in scope:

- keep Effects lazy, flat, sequential, composable, and executed at application
  boundaries;
- reuse Schema-derived types, branded identities, tagged errors, Config,
  services, and Layers;
- forbid raw-client escape hatches, generic SDK callbacks, `instanceof` policy,
  primitive semantic config, raw semantic identifiers, and unchecked output;
- keep one-use transformations inline and reject helper, wrapper, hook, and
  module sprawl without semantic weight and a real reuse or substitution point;
- separate schema/type/service contracts, live Layers, test Layers, and testing
  support through explicit package exports; and
- keep data loading, Effect execution, remote commands, and orchestration at
  route or feature boundaries while presentation leaves receive narrow readonly
  values and callbacks.
