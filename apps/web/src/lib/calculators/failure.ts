import type { CalculationCallFailure } from "@taxkit/api-http/errors";
import { Match } from "effect";

import type { TaxKitWebConfigError } from "../host/errors";

// Both page containers apply this safe, manual-retry guidance to checked errors.
// Never render a transport Cause or provider message in the page.
export const calculationFailureMessage = (
  error: CalculationCallFailure | TaxKitWebConfigError
) =>
  Match.value(error).pipe(
    Match.tag(
      "CalculatorCapacityExceeded",
      "CalculatorOperationTimedOut",
      "CalculatorRequestBodyTooLarge",
      "CalculatorRequestBodyTimedOut",
      "CalculatorRateLimited",
      "CalculatorAdmissionUnavailable",
      "ApiReplyTooLarge",
      "ApiReplyMismatch",
      "ApiDeadlineExceeded",
      "ApiUnavailable",
      (failure) => failure.message
    ),
    Match.tag(
      "InputValidationError",
      "CalculationError",
      "UnsupportedCalculatorError",
      "UnsupportedCalculatorContextError",
      () =>
        "The calculation could not finish. Check your details. Please try again."
    ),
    Match.tag(
      "TaxKitWebConfigError",
      () => "TaxKit cannot load its settings. Reload the page to try again."
    ),
    Match.exhaustive
  );
