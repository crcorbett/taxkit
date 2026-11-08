import { DopplerSecretsError } from "@alchemy.run/doppler";
import { describe, expect, it } from "@effect/vitest";
import { AuthError } from "alchemy/Auth/AuthProvider";
import { Redacted, Schema } from "effect";

import { SecretSourceError, dopplerSourceError } from "../src/secrets.js";

const token = "dp.st.private-doppler-token-sentinel";
const nativeFailure = (tag: string) =>
  new DopplerSecretsError({
    cause: { _tag: tag, message: `provider detail ${token}` },
    credentials: { profileName: "private-profile", token: Redacted.make(token) },
    selection: { config: "prd", project: "taxkit" },
  });

describe("Doppler secret source failures", () => {
  it.each([
    { failure: nativeFailure("Unauthorized"), reason: "unauthorized" },
    { failure: nativeFailure("NotFound"), reason: "not-found" },
    { failure: nativeFailure("TimeoutError"), reason: "unavailable" },
    {
      failure: new AuthError({ message: "Missing Doppler credentials" }),
      reason: "unauthorized",
    },
    { failure: new Error(token), reason: "unavailable" },
  ] as const)("classifies a native failure as $reason", ({ failure, reason }) => {
    const error = dopplerSourceError(failure);
    expect({
      encoded: JSON.stringify(Schema.encodeUnknownSync(SecretSourceError)(error)),
      reason: error.reason,
    }).toStrictEqual({
      encoded: JSON.stringify({
        _tag: "SecretSourceError",
        source: "doppler",
        reason,
      }),
      reason,
    });
  });
});
