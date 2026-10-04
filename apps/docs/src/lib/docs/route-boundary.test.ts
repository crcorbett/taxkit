import { describe, expect, it as test } from "@effect/vitest";
import { DocsSourceError } from "@taxkit/docs-content/errors";
import { DocsNavigation, DocsSourcePath } from "@taxkit/docs-content/schemas";
import { Cause, Effect, Equal, Exit, Result, Schema } from "effect";

import { DocsContentPreloadError, DocsRouteTransportError } from "./errors";
import { docsHomeRouteBoundary } from "./route-boundary";

const homeSuccess = {
  navigation: DocsNavigation.make({
    contentRoot: "packages/docs-content/content",
    primaryNavigation: [],
    status: "published",
  }),
  pages: [],
} as const;

const expectedErrors = [
  new DocsContentPreloadError({
    message: "Unable to preload content",
    path: DocsSourcePath.make("content/start.mdx"),
  }),
  new DocsSourceError({
    message: "The docs source failed.",
    operation: "getPage",
  }),
] as const;

const encodeHomeExit = Schema.encodeEffect(docsHomeRouteBoundary.codec);
const encodeUntrustedDefectExit = Schema.encodeEffect(
  Schema.toCodecJson(
    Schema.Exit(Schema.Unknown, Schema.Unknown, Schema.Defect())
  )
);

describe("docs route boundary", () => {
  test.effect(
    "round-trips canonical success through the encoded representation",
    () =>
      Effect.gen(function* () {
        const encoded = yield* docsHomeRouteBoundary.encodeExit(
          Effect.succeed(homeSuccess)
        );
        const result = docsHomeRouteBoundary.restore(encoded);

        expect(Result.isSuccess(result)).toBe(true);
        if (Result.isSuccess(result)) {
          expect(result.success).toEqual(homeSuccess);
        }
      })
  );

  test.effect("round-trips every expected docs failure", () =>
    Effect.forEach(
      expectedErrors,
      (error) =>
        Effect.gen(function* () {
          const encoded = yield* docsHomeRouteBoundary.encodeExit(
            Effect.fail(error)
          );
          const result = docsHomeRouteBoundary.restore(encoded);
          expect(Result.isFailure(result)).toBe(true);
          if (Result.isFailure(result)) {
            expect(result.failure._tag).toBe(error._tag);
          }
        }),
      { concurrency: 4 }
    )
  );

  test("maps malformed transport to the canonical transport error", () => {
    const result = docsHomeRouteBoundary.restore({ malformed: true });
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(Schema.is(DocsRouteTransportError)(result.failure)).toBe(true);
    }
  });

  test.effect(
    "preserves standalone and composite defects and interruptions",
    () =>
      Effect.gen(function* () {
        const expectedFailure = new DocsSourceError({
          message: "Expected source failure",
          operation: "getPage",
        });
        const causes = [
          Cause.die(new Error("standalone defect")),
          Cause.interrupt(101),
          Cause.combine(
            Cause.fail(expectedFailure),
            Cause.die(new Error("composite defect"))
          ),
          Cause.combine(Cause.fail(expectedFailure), Cause.interrupt(102)),
        ];

        yield* Effect.forEach(
          causes,
          (cause) =>
            Effect.gen(function* () {
              const exit = yield* Effect.exit(
                docsHomeRouteBoundary.encodeExit(Effect.failCause(cause))
              );
              expect(Exit.isFailure(exit)).toBe(true);
              if (Exit.isFailure(exit)) {
                expect(Equal.equals(exit.cause, cause)).toBe(true);
              }
            }),
          { concurrency: 4 }
        );
      })
  );

  test.effect(
    "turns empty and multiple producer failures into invariant defects",
    () =>
      Effect.gen(function* () {
        const invalidCauses = [
          {
            cause: Cause.empty,
            message: "Docs route failure contained no expected error",
          },
          {
            cause: Cause.combine(
              Cause.fail(
                new DocsSourceError({
                  message: "First source failure",
                  operation: "getPage",
                })
              ),
              Cause.fail(
                new DocsSourceError({
                  message: "Second source failure",
                  operation: "getPage",
                })
              )
            ),
            message: "Docs route failure contained multiple expected errors",
          },
        ];

        yield* Effect.forEach(
          invalidCauses,
          ({ cause, message }) =>
            Effect.gen(function* () {
              const exit = yield* Effect.exit(
                docsHomeRouteBoundary.encodeExit(Effect.failCause(cause))
              );
              expect(Exit.isFailure(exit)).toBe(true);
              if (Exit.isFailure(exit)) {
                expect(Cause.hasDies(exit.cause)).toBe(true);
                expect(Cause.pretty(exit.cause)).toContain(message);
              }
            }),
          { concurrency: 4 }
        );
      })
  );

  test.effect(
    "rejects decoded empty, multiple, interrupted and defect representations",
    () =>
      Effect.gen(function* () {
        const decodedInvalidRepresentations = yield* Effect.all([
          encodeHomeExit(Exit.failCause(Cause.empty)),
          encodeHomeExit(
            Exit.failCause(
              Cause.combine(
                Cause.fail(
                  new DocsSourceError({
                    message: "First source failure",
                    operation: "getPage",
                  })
                ),
                Cause.fail(
                  new DocsSourceError({
                    message: "Second source failure",
                    operation: "getPage",
                  })
                )
              )
            )
          ),
          encodeHomeExit(Exit.failCause(Cause.interrupt(103))),
          encodeUntrustedDefectExit(
            Exit.failCause(Cause.die(new Error("untrusted defect")))
          ),
        ]);

        yield* Effect.forEach(decodedInvalidRepresentations, (encoded) =>
          Effect.sync(() => {
            const result = docsHomeRouteBoundary.restore(encoded);
            expect(Result.isFailure(result)).toBe(true);
            if (Result.isFailure(result)) {
              expect(Schema.is(DocsRouteTransportError)(result.failure)).toBe(
                true
              );
            }
          })
        );
      })
  );
});
