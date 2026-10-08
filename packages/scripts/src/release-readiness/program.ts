import { Array as EffectArray, Effect, Match, Option, Result } from "effect";

import {
  CiReleaseCheckFailedError,
  ReleaseAttemptFailedError,
} from "./errors.js";
import type {
  ReleaseAttemptReceipt,
  ReleaseCandidateIdentity,
  ReleaseCheck,
  ReleaseCommandOutcome,
  ReleaseDetailArtifact,
  ReleaseAttemptId,
} from "./schemas.js";
import { CiReleaseReadinessReport, ReleaseReadinessReport } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

const collectDetailArtifacts = (
  details: readonly (ReleaseDetailArtifact | null)[]
) =>
  EffectArray.filterMap(details, (detail) =>
    detail === null
      ? Result.failVoid
      : Result.succeed({ path: detail.path, sha256: detail.sha256 })
  );

const makeAttemptReceipt = (
  input: Readonly<
    Pick<
      ReleaseAttemptReceipt,
      | "attemptId"
      | "candidate"
      | "detailArtifacts"
      | "failedCheck"
      | "lastSuccessfulCheck"
      | "observedExitCode"
      | "provenance"
      | "target"
      | "terminalState"
    >
  >
): ReleaseAttemptReceipt => ({
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

export const createSuccessfulAttemptReceipt = (
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
    const completed = yield* Effect.reduce(
      checks,
      () => EffectArray.empty<ReleaseCommandOutcome>(),
      (priorOutcomes, check) =>
        Effect.gen(function* runReleaseCheck() {
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
              Effect.succeed(EffectArray.append(priorOutcomes, outcome))
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
        })
    );

    return new ReleaseReadinessReport({
      attemptId,
      outcomes: completed,
    });
  });

export const runCiReleaseReadiness = (checks: readonly ReleaseCheck[]) =>
  Effect.gen(function* runCiReleaseReadinessProgram() {
    const commandRunner = yield* ReleaseCommandRunner;
    const completed = yield* Effect.reduce(
      checks,
      () => EffectArray.empty<ReleaseCommandOutcome>(),
      (priorOutcomes, check) =>
        Effect.gen(function* runCiReleaseCheck() {
          const target = [check.command, ...check.args].join(" ");
          const outcome = yield* commandRunner.execute(check).pipe(
            Effect.catchTag("ReleaseCommandExecutionError", (error) =>
              Effect.fail(
                new CiReleaseCheckFailedError({
                  failedCheck: check.id,
                  lastSuccessfulCheck: lastSuccessfulCheck(priorOutcomes),
                  observedExitCode: error.observedExitCode,
                  stderrExcerpt: "",
                  stdoutExcerpt: "",
                  target,
                  terminalState: error.terminalState,
                })
              )
            )
          );
          if (outcome.terminalState !== "success") {
            return yield* Effect.fail(
              new CiReleaseCheckFailedError({
                failedCheck: check.id,
                lastSuccessfulCheck: lastSuccessfulCheck(priorOutcomes),
                observedExitCode: outcome.exitCode,
                stderrExcerpt: outcome.stderrExcerpt,
                stdoutExcerpt: outcome.stdoutExcerpt,
                target,
                terminalState: outcome.terminalState,
              })
            );
          }
          return yield* Effect.succeed(
            EffectArray.append(priorOutcomes, outcome)
          );
        })
    );
    return new CiReleaseReadinessReport({
      mode: "ci",
      outcomes: completed,
    });
  });
