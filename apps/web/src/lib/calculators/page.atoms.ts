import { requestCalculation } from "@taxkit/api-http/requests";
import { makeCalculatorPages } from "@taxkit/calculators/page";
import type { CalculatorRunServiceRequest } from "@taxkit/calculators/schemas";
import { Effect } from "effect";

import { ApiClient, apiClientRuntime } from "../api-client.atoms";
import { calculationFailureMessage } from "./failure";
// Each calculator page calculates through the native browser client. Replacing
// the request or interrupting it cancels the browser call.
export const calculatorPageAtoms = makeCalculatorPages({
  calculation: () =>
    apiClientRuntime.fn<CalculatorRunServiceRequest>()((request) =>
      ApiClient.pipe(
        Effect.flatMap((client) =>
          requestCalculation({
            client,
            request,
          })
        )
      )
    ),
  failureMessage: calculationFailureMessage,
});
