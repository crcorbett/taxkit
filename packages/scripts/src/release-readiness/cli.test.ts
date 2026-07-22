import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { decodeReleaseReadinessCli } from "./cli.js";

describe("release readiness CLI ingress", () => {
  it.effect("decodes only candidate or report-only CI modes", () =>
    Effect.gen(function* testReleaseReadinessCli() {
      expect(yield* decodeReleaseReadinessCli([])).toEqual({
        mode: "candidate",
      });
      expect(yield* decodeReleaseReadinessCli(["--ci"])).toEqual({
        mode: "ci",
      });
      expect(
        (yield* decodeReleaseReadinessCli(["--ci", "--write"]).pipe(
          Effect.flip
        ))._tag
      ).toBe("ReleaseReadinessCliError");
    })
  );
});
