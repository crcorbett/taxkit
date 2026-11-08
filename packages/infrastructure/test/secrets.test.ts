import { DopplerSecretsError } from "@alchemy.run/doppler";
import { describe, expect, it } from "@effect/vitest";
import { AuthError } from "alchemy/Auth/AuthProvider";
import { Redacted, Schema } from "effect";

import { SecretSourceError, dopplerSourceError } from "../src/secrets.js";

const token = "dp.st.private-doppler-token-sentinel";
// The native SDK failures the Doppler provider wraps.
class Unauthorized extends Schema.TaggedClass<
  Unauthorized,
  { readonly brand: unique symbol }
>()("Unauthorized", {
  message: Schema.String,
}) {}
class NotFound extends Schema.TaggedClass<
  NotFound,
  { readonly brand: unique symbol }
>()("NotFound", {
  message: Schema.String,
}) {}
class TimeoutError extends Schema.TaggedClass<
  TimeoutError,
  { readonly brand: unique symbol }
>()("TimeoutError", {
  message: Schema.String,
}) {}
const nativeFailure = (cause: Unauthorized | NotFound | TimeoutError) =>
  new DopplerSecretsError({
    cause,
    credentials: {
      profileName: "private-profile",
      token: Redacted.make(token),
    },
    selection: { config: "prd", project: "taxkit" },
  });
const detail = { message: `provider detail ${token}` };

describe("Doppler secret source failures", () => {
  it.each([
    {
      failure: nativeFailure(new Unauthorized(detail)),
      reason: "unauthorized",
    },
    { failure: nativeFailure(new NotFound(detail)), reason: "not-found" },
    { failure: nativeFailure(new TimeoutError(detail)), reason: "unavailable" },
    {
      failure: new AuthError({ message: "Missing Doppler credentials" }),
      reason: "unauthorized",
    },
    { failure: new Error(token), reason: "unavailable" },
  ] as const)(
    "classifies a native failure as $reason",
    ({ failure, reason }) => {
      // Strict equality admits no other field: no cause, token or selection.
      const error = dopplerSourceError(failure);
      expect(error).toStrictEqual(
        new SecretSourceError({ source: "doppler", reason })
      );
    }
  );
});
