import {
  apiReadTimeout,
  requestCalculation,
  requestDocsSearch,
} from "@taxkit/api-http/requests";
import type { TaxKitClient } from "@taxkit/api-http/requests";
import { isRequestedDocsPage } from "@taxkit/content/response-check";
import { Effect, Match } from "effect";

import { McpToolUnavailable } from "./errors.js";
import { TaxKitMcpToolkit } from "./tools.js";

const unavailable = () =>
  new McpToolUnavailable({
    code: "service-unavailable",
    retry: "try-again-manually",
  });

/**
 * Tool handlers for a host that reaches TaxKit only through the generated
 * public API client, such as browser WebMCP. They answer with the same
 * success Schemas and the same safe `McpToolUnavailable` vocabulary as the
 * service-backed handlers; transport, reply and deadline failures never leak
 * their cause. Reads keep the client's ten-second bound.
 */
export const clientToolHandlers = (client: TaxKitClient) =>
  TaxKitMcpToolkit.of({
    taxkit_calculate: Effect.fn("TaxKitMcpToolkit.taxkit_calculate")(
      (request) =>
        requestCalculation({ client, request }).pipe(
          Effect.mapError((error) =>
            Match.value(error).pipe(
              Match.tag(
                "CalculatorRateLimited",
                () =>
                  new McpToolUnavailable({
                    code: "rate-limited",
                    retry: "wait-then-try-manually",
                  })
              ),
              Match.tag(
                "CalculatorCapacityExceeded",
                () =>
                  new McpToolUnavailable({
                    code: "capacity-exceeded",
                    retry: "try-again-manually",
                  })
              ),
              Match.tag(
                "CalculatorOperationTimedOut",
                "CalculatorRequestBodyTimedOut",
                "ApiDeadlineExceeded",
                () =>
                  new McpToolUnavailable({
                    code: "operation-timeout",
                    retry: "try-again-manually",
                  })
              ),
              Match.tag(
                "CalculationError",
                "InputValidationError",
                "UnsupportedCalculatorError",
                "UnsupportedCalculatorContextError",
                "CalculatorRequestBodyTooLarge",
                () =>
                  new McpToolUnavailable({
                    code: "invalid-calculation",
                    retry: "check-input-before-retrying",
                  })
              ),
              Match.tag(
                "CalculatorAdmissionUnavailable",
                "ApiUnavailable",
                "ApiReplyTooLarge",
                "ApiReplyMismatch",
                unavailable
              ),
              Match.exhaustive
            )
          )
        )
    ),
    taxkit_docs_navigation: Effect.fn(
      "TaxKitMcpToolkit.taxkit_docs_navigation"
    )(() =>
      client.content
        .getNavigation()
        .pipe(Effect.timeout(apiReadTimeout), Effect.mapError(unavailable))
    ),
    taxkit_find_docs: Effect.fn("TaxKitMcpToolkit.taxkit_find_docs")(
      ({ term }) =>
        requestDocsSearch({ client, term }).pipe(
          Effect.map((results) => ({ results })),
          Effect.mapError(unavailable)
        )
    ),
    taxkit_get_calculator_schema: Effect.fn(
      "TaxKitMcpToolkit.taxkit_get_calculator_schema"
    )(({ calculatorId, ...query }) =>
      client.calculatorApi
        .getCalculatorSchema({ params: { calculatorId }, query })
        .pipe(Effect.timeout(apiReadTimeout), Effect.mapError(unavailable))
    ),
    taxkit_list_calculators: Effect.fn(
      "TaxKitMcpToolkit.taxkit_list_calculators"
    )((query) =>
      client.calculatorApi
        .listCalculators({ query })
        .pipe(Effect.timeout(apiReadTimeout), Effect.mapError(unavailable))
    ),
    taxkit_read_doc: Effect.fn("TaxKitMcpToolkit.taxkit_read_doc")(({ path }) =>
      client.content.getPage({ query: { path } }).pipe(
        Effect.timeout(apiReadTimeout),
        // The reply must be the page that was asked for.
        Effect.filterOrFail((page) => isRequestedDocsPage(path, page)),
        Effect.mapError(unavailable)
      )
    ),
  });
