import { expect, it as test } from "@effect/vitest";
import { Effect, Match, Result } from "effect";

import { hashEpochBytes } from "../harness-foundation/input.boundary.js";
import { hashHgi206Text, restoreChangedPaths } from "./input.boundary.js";

test.effect.each([
  {
    expected:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    source: "",
  },
  {
    expected:
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    source: "abc",
  },
  {
    expected:
      "7eb898ae9c8bbbcf6a419b3ef8dee5003bd23de0968f4fb1eb12aa9d836c6f27",
    source: "TaxKit — café",
  },
])(
  "preserves SHA-256 text and byte results for $source",
  ({ source, expected }) =>
    Effect.gen(function* () {
      expect(yield* hashHgi206Text(source)).toBe(expected);
      expect(yield* hashEpochBytes(new TextEncoder().encode(source))).toBe(
        expected
      );
    })
);

test.effect("rejects malformed UTF-8 before restoring changed paths", () =>
  Effect.gen(function* () {
    const result = yield* restoreChangedPaths(new Uint8Array([0xff])).pipe(
      Effect.result
    );
    Result.match(result, {
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("Hgi206InputError", (failure) => {
            expect(failure.target).toBe("git-status-porcelain");
          }),
          Match.exhaustive
        ),
      onSuccess: () => expect.unreachable(),
    });
  })
);
