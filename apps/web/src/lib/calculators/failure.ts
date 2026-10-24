import type { CalculationCallFailure } from "@taxkit/api-http/errors";
import { Match } from "effect";

// Both page containers apply this safe, manual-retry guidance to checked errors.
// Never render a transport Cause or provider message in the page.
export const calculationFailureMessage = (error: CalculationCallFailure) =>
  Match.value(error).pipe(
    Match.tag(
      "CalculatorCapacityExceeded",
      "CalculatorOperationTimedOut",
      "CalculatorRequestBodyTooLarge",
      "CalculatorRequestBodyTimedOut",
      "CalculatorRateLimited",
      "CalculatorAdmissionUnavailable",
      "ApiReplyTooLarge",
      "ApiDeadlineExceeded",
      "ApiUnavailable",
      (failure) => failure.message
    ),
    Match.orElse(
      () =>
        "The calculation could not finish. Check your details. Please try again."
    )
  );
