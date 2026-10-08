import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import { Crypto, Effect, PlatformError, Record, Result } from "effect";
import type { Schema } from "effect";

import { deploymentRecordDigest } from "./retained-record.egress.js";

// Fixed SHA-256 values bind the original saved-record representation.
// Numeric keys must follow the original text ordering, even though ordinary
// JSON object serialisation puts integer keys in numerical order.
const vectors: readonly (readonly [string, Schema.Json, string])[] = [
  [
    "null",
    null,
    "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b",
  ],
  [
    "boolean",
    true,
    "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
  ],
  [
    "finite number",
    -12.5,
    "6e734d1ba4828d18ef4d256e8820f89e30551bca8b2c5740f2ed9fc532da07de",
  ],
  [
    "Unicode and escaped text",
    'café\n"\\',
    "9cc566ceb66a420a687f11feece885fa5b866599461451d18526a74a69e173d7",
  ],
  [
    "numeric object keys",
    { "10": false, "2": true },
    "7fe8ca0be3be4b2b9edd43fed62bc404c56f31d329e78a9236bc281954df88c5",
  ],
  [
    "nested fields",
    { a: "x", z: [null, { a: 1, b: 2 }] },
    "c57c7ef84fc763146c8bc7d16e5bf58b08b286ff946416d87dc68cedcf6808f6",
  ],
  [
    "array order",
    [3, 2, 1],
    "30c8681f9b840aceee56b737f3b126ae67ec4eb71d2881db831f86014fba016d",
  ],
];

test.effect.each(vectors)(
  "retains the canonical fingerprint for %s",
  ([_name, value, expected]) =>
    deploymentRecordDigest(value).pipe(
      Effect.tap((digest) => Effect.sync(() => expect(digest).toBe(expected))),
      Effect.provide(BunServices.layer)
    )
);

test.effect("ignores object insertion order but retains array order", () =>
  Effect.gen(function* () {
    const first = yield* deploymentRecordDigest(
      Record.fromEntries<readonly [string, Schema.Json]>([
        ["b", [1, 2]],
        ["a", null],
      ])
    );
    const reordered = yield* deploymentRecordDigest({ a: null, b: [1, 2] });
    const reversed = yield* deploymentRecordDigest({ a: null, b: [2, 1] });
    expect(first).toBe(reordered);
    expect(first).not.toBe(reversed);
  }).pipe(Effect.provide(BunServices.layer))
);

test.effect(
  "rejects non-finite JSON numbers with a bounded encoding error",
  () =>
    Effect.gen(function* () {
      const result = yield* deploymentRecordDigest(Number.NaN).pipe(
        Effect.result
      );
      expect(Result.isFailure(result)).toBe(true);
      Result.match(result, {
        onFailure: (error) => expect(error.reason).toBe("encode"),
        onSuccess: () =>
          expect.fail("A non-finite value must fail before hashing."),
      });
    }).pipe(Effect.provide(BunServices.layer))
);

test.effect(
  "keeps a digest service failure free of underlying secret text",
  () =>
    Effect.gen(function* () {
      const crypto = Crypto.make({
        digest: () =>
          Effect.fail(
            PlatformError.badArgument({
              description: "TAXKIT_SECRET_SENTINEL",
              method: "digest",
              module: "Crypto",
            })
          ),
        randomBytes: (size) => new Uint8Array(size),
      });
      const result = yield* deploymentRecordDigest({ a: "record" }).pipe(
        Effect.provideService(Crypto.Crypto, crypto),
        Effect.result
      );
      expect(Result.isFailure(result)).toBe(true);
      Result.match(result, {
        onFailure: (error) => {
          expect(error._tag).toBe("DocsDeploymentRecordDigestError");
          expect(error.reason).toBe("digest");
          expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
        },
        onSuccess: () =>
          expect.fail("The failed digest service must stay failed."),
      });
    })
);
