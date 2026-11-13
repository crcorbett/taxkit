import { describe, expect, it } from "@effect/vitest";
import { ApiReplyMismatch } from "@taxkit/api-http/errors";

import { calculationFailureMessage } from "../../src/lib/calculators/failure";

describe("calculation failure messages", () => {
  it("shows a reply mismatch as an API fault, not a visitor input problem", () => {
    const message = calculationFailureMessage(new ApiReplyMismatch());
    expect(message).toBe(
      "The reply did not match the request. Please try again."
    );
  });
});
