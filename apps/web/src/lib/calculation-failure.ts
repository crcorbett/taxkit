import { Match } from "effect";

import type { WebsiteCalculationFailure } from "./api/errors";
import type { TaxKitWebConfigError } from "./config";
import type { WebsiteInputError } from "./form.boundary";

// Both page containers apply this safe, manual-retry guidance to checked errors.
// Never render a transport Cause or provider message in the page.
export const calculationFailureMessage = (
  error: WebsiteCalculationFailure | TaxKitWebConfigError | WebsiteInputError
) =>
  Match.value(error).pipe(
    Match.tag(
      "CalculatorCapacityExceeded",
      "CalculatorOperationTimedOut",
      "CalculatorRequestBodyTooLarge",
      "CalculatorRequestBodyTimedOut",
      "CalculatorRateLimited",
      "CalculatorAdmissionUnavailable",
      "WebsiteApiResponseTooLarge",
      "WebsiteApiDeadlineExceeded",
      "WebsiteApiUnavailable",
      "WebsiteInputError",
      (failure) => failure.message
    ),
    Match.orElse(
      () =>
        "The calculation could not finish. Check your details. Please try again."
    )
  );
