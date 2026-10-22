import { assert, it } from "@effect/vitest";
import { ConfigProvider, Effect } from "effect";

import { TaxKitApiOriginConfig } from "../src/origin.js";

const read = (input: Readonly<Record<string, string>>) =>
  TaxKitApiOriginConfig.pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown(input)
    )
  );

it.effect("reads the API origin from its one host binding name", () =>
  Effect.gen(function* () {
    const origin = yield* read({
      API_PUBLIC_ORIGIN: "https://api.example.com",
    });
    assert.strictEqual(origin.href, "https://api.example.com/");
  })
);

it.effect.each([
  {},
  { API_PUBLIC_ORIGIN: "https://api.example.com/v1" },
  { API_PUBLIC_ORIGIN: "http://api.example.com" },
])("rejects absent or non-origin bindings %j", (input) =>
  Effect.gen(function* () {
    assert.isTrue(yield* read(input).pipe(Effect.isFailure));
  })
);
