import { describe, expect, test } from "bun:test";

import {
  DocsPageNotFoundError,
  DocsSourceError,
} from "@whattax/docs-content/errors";
import { Cause, Effect, Equal, Exit, Result, Schema } from "effect";

import { DocsContentPreloadError, DocsRouteTransportError } from "./errors";
import { docsHomeRouteBoundary } from "./route-boundary";

const homeSuccess = {
  navigation: {
    contentRoot: "apps/docs/content",
    primaryNavigation: [],
    status: "published",
  },
  pages: [],
};

const expectedErrors = [
  new DocsContentPreloadError({
    message: "Unable to preload content",
    path: "content/start.mdx",
  }),
  new DocsPageNotFoundError({ path: "/missing" }),
  new DocsSourceError({ cause: new Error("source failed") }),
];

const encodeHomeExit = Schema.encodeSync(docsHomeRouteBoundary.codec);
const encodeUntrustedDefectExit = Schema.encodeSync(
  Schema.toCodecJson(Schema.Exit(Schema.Unknown, Schema.Unknown, Schema.Defect))
);

const expectTransportFailure = (result) => {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) {
    expect(result.failure).toBeInstanceOf(DocsRouteTransportError);
  }
};

describe("docs route boundary", () => {
  test("round-trips canonical success through the encoded representation", async () => {
    const encoded = await Effect.runPromise(
      docsHomeRouteBoundary.encodeExit(Effect.succeed(homeSuccess))
    );
    const result = docsHomeRouteBoundary.restore(encoded);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.success).toEqual(homeSuccess);
    }
  });

  test("round-trips every expected docs failure", async () => {
    for (const error of expectedErrors) {
      const encoded = await Effect.runPromise(
        docsHomeRouteBoundary.encodeExit(Effect.fail(error))
      );
      const result = docsHomeRouteBoundary.restore(encoded);

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.failure._tag).toBe(error._tag);
      }
    }
  });

  test("maps malformed transport to the canonical transport error", () => {
    expectTransportFailure(docsHomeRouteBoundary.restore({ malformed: true }));
  });

  test("preserves standalone and composite defects and interruptions", async () => {
    const expectedFailure = new DocsPageNotFoundError({ path: "/missing" });
    const causes = [
      Cause.die(new Error("standalone defect")),
      Cause.interrupt(101),
      Cause.combine(
        Cause.fail(expectedFailure),
        Cause.die(new Error("composite defect"))
      ),
      Cause.combine(Cause.fail(expectedFailure), Cause.interrupt(102)),
    ];

    for (const cause of causes) {
      const exit = await Effect.runPromiseExit(
        docsHomeRouteBoundary.encodeExit(Effect.failCause(cause))
      );

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(Equal.equals(exit.cause, cause)).toBe(true);
      }
    }
  });

  test("turns empty and multiple producer failures into invariant defects", async () => {
    const invalidCauses = [
      {
        cause: Cause.empty,
        message: "Docs route failure contained no expected error",
      },
      {
        cause: Cause.combine(
          Cause.fail(new DocsPageNotFoundError({ path: "/first" })),
          Cause.fail(new DocsPageNotFoundError({ path: "/second" }))
        ),
        message: "Docs route failure contained multiple expected errors",
      },
    ];

    for (const { cause, message } of invalidCauses) {
      const exit = await Effect.runPromiseExit(
        docsHomeRouteBoundary.encodeExit(Effect.failCause(cause))
      );

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(Cause.hasDies(exit.cause)).toBe(true);
        expect(Cause.pretty(exit.cause)).toContain(message);
      }
    }
  });

  test("rejects decoded empty, multiple, interrupted and defect representations", () => {
    const decodedInvalidRepresentations = [
      encodeHomeExit(Exit.failCause(Cause.empty)),
      encodeHomeExit(
        Exit.failCause(
          Cause.combine(
            Cause.fail(new DocsPageNotFoundError({ path: "/first" })),
            Cause.fail(new DocsPageNotFoundError({ path: "/second" }))
          )
        )
      ),
      encodeHomeExit(Exit.failCause(Cause.interrupt(103))),
      encodeUntrustedDefectExit(
        Exit.failCause(Cause.die(new Error("untrusted defect")))
      ),
    ];

    for (const encoded of decodedInvalidRepresentations) {
      expectTransportFailure(docsHomeRouteBoundary.restore(encoded));
    }
  });
});
