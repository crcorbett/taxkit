import * as BunServices from "@effect/platform-bun/BunServices";
import { expect, it as test } from "@effect/vitest";
import {
  Crypto,
  Effect,
  FileSystem,
  PlatformError,
  Result,
  Schema,
} from "effect";

import { readDeploymentJson, readDeploymentSha256 } from "./input.boundary.js";

const KnownReceipt = Schema.Struct({ name: Schema.Literal("retained") });

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
])("preserves SHA-256 for retained $source bytes", ({ source, expected }) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const root = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-deployment-input-",
    });
    yield* fileSystem.writeFileString(`${root}/source.txt`, source);
    expect(yield* readDeploymentSha256(root, "source.txt")).toBe(expected);
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect("restores the receipt once at the file boundary", () =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const root = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-deployment-input-",
    });
    yield* fileSystem.writeFileString(
      `${root}/receipt.json`,
      '{"name":"retained"}'
    );
    expect(
      yield* readDeploymentJson(root, "receipt.json", KnownReceipt)
    ).toEqual({ name: "retained" });
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect.each([
  "not JSON",
  '{"name":"wrong"}',
  '{"name":"retained","extra":"TAXKIT_SECRET_SENTINEL"}',
])("returns only a safe file identity for invalid receipt %s", (source) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const root = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-deployment-input-",
    });
    yield* fileSystem.writeFileString(`${root}/receipt.json`, source);
    const result = yield* readDeploymentJson(
      root,
      "receipt.json",
      KnownReceipt
    ).pipe(Effect.result);
    Result.match(result, {
      onFailure: (error) => {
        expect(error._tag).toBe("DocsDeploymentInputError");
        expect(error.target).toBe("receipt.json");
        expect(String(error)).not.toContain(root);
        expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
      },
      onSuccess: () => expect.unreachable(),
    });
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect("keeps missing file and hash failures bounded to the target", () =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const root = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-deployment-input-",
    });
    yield* Effect.forEach(
      [
        readDeploymentJson(root, "missing.json", KnownReceipt).pipe(
          Effect.asVoid
        ),
        readDeploymentSha256(root, "missing.json").pipe(Effect.asVoid),
      ],
      (operation) =>
        operation.pipe(
          Effect.result,
          Effect.map((result) =>
            Result.match(result, {
              onFailure: (error) => {
                expect(error._tag).toBe("DocsDeploymentInputError");
                expect(error.target).toBe("missing.json");
                expect(String(error)).not.toContain(root);
              },
              onSuccess: () => expect.unreachable(),
            })
          )
        )
    );
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);

test.effect(
  "maps a Crypto failure without retaining the underlying error",
  () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const root = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "taxkit-deployment-input-",
      });
      yield* fileSystem.writeFileString(`${root}/source.txt`, "abc");
      const failedCrypto = Crypto.make({
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
      const result = yield* readDeploymentSha256(root, "source.txt").pipe(
        Effect.provideService(Crypto.Crypto, failedCrypto),
        Effect.result
      );
      Result.match(result, {
        onFailure: (error) => {
          expect(error._tag).toBe("DocsDeploymentInputError");
          expect(error.target).toBe("source.txt");
          expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
        },
        onSuccess: () => expect.unreachable(),
      });
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
);
