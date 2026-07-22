import {
  Array as EffectArray,
  Effect,
  Match,
  Option,
  Ref,
  Result,
} from "effect";

import { ReleaseAttemptFailedError } from "./errors.js";
import type {
  ReleaseAttemptReceipt,
  ReleaseCandidateIdentity,
  ReleaseCheck,
  ReleaseCommandOutcome,
  ReleaseDetailArtifact,
  ReleaseTerminalState,
  ReleaseAttemptId,
} from "./schemas.js";
import { ReleaseReadinessReport } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

const collectDetailArtifacts = (
  details: readonly (ReleaseDetailArtifact | null)[]
) =>
  EffectArray.filterMap(details, (detail) =>
    detail === null
      ? Result.failVoid
      : Result.succeed({ path: detail.path, sha256: detail.sha256 })
  );

const makeAttemptReceipt = (input: {
  readonly attemptId: ReleaseAttemptId;
  readonly candidate: ReleaseCandidateIdentity;
  readonly detailArtifacts: ReleaseAttemptReceipt["detailArtifacts"];
  readonly failedCheck: ReleaseAttemptReceipt["failedCheck"];
  readonly lastSuccessfulCheck: ReleaseAttemptReceipt["lastSuccessfulCheck"];
  readonly observedExitCode: number | null;
  readonly provenance: string;
  readonly target: string;
  readonly terminalState: ReleaseTerminalState;
}): ReleaseAttemptReceipt => ({
  attemptId: input.attemptId,
  candidate: input.candidate,
  detailArtifacts: input.detailArtifacts,
  failedCheck: input.failedCheck,
  lastSuccessfulCheck: input.lastSuccessfulCheck,
  limitation:
    "This local attempt does not establish registry, release, deployment, provider, deployed SSR or public-site state.",
  nonClaim:
    "No package was published and no tag, release, deployment or provider mutation was performed.",
  observedExitCode: input.observedExitCode,
  postcondition:
    input.terminalState === "success"
      ? "Every ordered local check completed once with a true zero exit and retained sanitized detail."
      : "Release readiness remains unproved and this terminal state cannot be upgraded to success.",
  provenance: input.provenance,
  recovery:
    input.terminalState === "success"
      ? "Use this immutable attempt receipt for local release-readiness review."
      : "Inspect the retained sanitized artifacts; do not rerun this attempt for presentation; repair the named boundary first.",
  resumeTrigger:
    input.terminalState === "success"
      ? "A new candidate identity or release-relevant source change requires a new attempt."
      : "Start a new attempt only after a material source, configuration, dependency or environment change.",
  rollback:
    "Revert the candidate semantic commit while retaining this attempt receipt and all failed or accepted evidence.",
  schemaVersion: 1,
  target: input.target,
  terminalState: input.terminalState,
});

const lastSuccessfulCheck = (
  outcomes: readonly ReleaseCommandOutcome[]
): ReleaseAttemptReceipt["lastSuccessfulCheck"] =>
  Option.getOrNull(EffectArray.last(outcomes))?.check.id ?? null;

export const makeSuccessfulAttemptReceipt = (
  report: ReleaseReadinessReport,
  candidate: ReleaseCandidateIdentity
): ReleaseAttemptReceipt => {
  const finalOutcome = Option.getOrNull(EffectArray.last(report.outcomes));

  return makeAttemptReceipt({
    attemptId: report.attemptId,
    candidate,
    detailArtifacts: EffectArray.flatMap(report.outcomes, (outcome) =>
      collectDetailArtifacts([outcome.stdoutDetail, outcome.stderrDetail])
    ),
    failedCheck: null,
    lastSuccessfulCheck: finalOutcome?.check.id ?? null,
    observedExitCode: finalOutcome?.exitCode ?? null,
    provenance:
      "One sequential execution of the canonical local TaxKit release-readiness graph.",
    target: "bun run release:check",
    terminalState: "success",
  });
};

export const runReleaseReadiness = (
  checks: readonly ReleaseCheck[],
  attemptId: ReleaseAttemptId,
  candidate: ReleaseCandidateIdentity
) =>
  Effect.gen(function* releaseReadinessProgram() {
    const commandRunner = yield* ReleaseCommandRunner;
    const completed = yield* Ref.make<readonly ReleaseCommandOutcome[]>([]);

    yield* Effect.forEach(
      checks,
      (check) =>
        Effect.gen(function* runReleaseCheck() {
          const priorOutcomes = yield* Ref.get(completed);
          const commandTarget = [check.command, ...check.args].join(" ");
          const outcome = yield* commandRunner.execute(check).pipe(
            Effect.catchTag("ReleaseCommandExecutionError", (error) =>
              Effect.fail(
                new ReleaseAttemptFailedError({
                  attempt: makeAttemptReceipt({
                    attemptId,
                    candidate,
                    detailArtifacts: collectDetailArtifacts([
                      error.stdoutDetail,
                      error.stderrDetail,
                    ]),
                    failedCheck: check.id,
                    lastSuccessfulCheck: lastSuccessfulCheck(priorOutcomes),
                    observedExitCode: error.observedExitCode,
                    provenance: error.message,
                    target: commandTarget,
                    terminalState: error.terminalState,
                  }),
                })
              )
            )
          );

          return yield* Match.value(outcome.terminalState).pipe(
            Match.when("success", () =>
              Ref.update(completed, EffectArray.append(outcome))
            ),
            Match.orElse(() =>
              Effect.fail(
                new ReleaseAttemptFailedError({
                  attempt: makeAttemptReceipt({
                    attemptId,
                    candidate,
                    detailArtifacts: collectDetailArtifacts([
                      outcome.stdoutDetail,
                      outcome.stderrDetail,
                    ]),
                    failedCheck: check.id,
                    lastSuccessfulCheck: lastSuccessfulCheck(priorOutcomes),
                    observedExitCode: outcome.exitCode,
                    provenance:
                      "The process completed once and returned the recorded terminal outcome.",
                    target: commandTarget,
                    terminalState: outcome.terminalState,
                  }),
                })
              )
            )
          );
        }),
      { concurrency: 1 }
    );

    return new ReleaseReadinessReport({
      attemptId,
      outcomes: yield* Ref.get(completed),
    });
  });
