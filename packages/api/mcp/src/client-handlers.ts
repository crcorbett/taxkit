import {
  requestCalculation,
  requestCalculatorSchema,
  requestCatalogue,
  requestDocsNavigation,
  requestDocsPageAt,
  requestDocsSearch,
} from "@taxkit/api-http/requests";
import type { TaxKitClient } from "@taxkit/api-http/requests";
import { Effect } from "effect";

import { McpToolUnavailable } from "./errors.js";
import { TaxKitMcpToolkit } from "./tools.js";

// The generated client's own outcomes, shared by every read: no usable answer
// is unavailable, the ten-second deadline is a timeout, and a reply TaxKit got
// wrong is a server fault.
const clientFailures = {
  ApiDeadlineExceeded: () =>
    Effect.fail(
      new McpToolUnavailable({
        code: "operation-timeout",
        retry: "try-again-manually",
      })
    ),
  ApiReplyMismatch: () =>
    Effect.fail(
      new McpToolUnavailable({
        code: "server-fault",
        retry: "try-again-manually",
      })
    ),
  ApiReplyTooLarge: () =>
    Effect.fail(
      new McpToolUnavailable({
        code: "server-fault",
        retry: "try-again-manually",
      })
    ),
  ApiUnavailable: () =>
    Effect.fail(
      new McpToolUnavailable({
        code: "service-unavailable",
        retry: "try-again-manually",
      })
    ),
};

/**
 * Tool handlers for a host that reaches TaxKit only through the generated
 * public API client, such as browser WebMCP. They answer with the same
 * success Schemas and the same safe `McpToolUnavailable` codes as the
 * service-backed handlers for every shared outcome; transport, reply and
 * deadline failures never leak their cause. Reads keep the client's
 * ten-second bound.
 */
export const clientToolHandlers = (client: TaxKitClient) =>
  TaxKitMcpToolkit.of({
    taxkit_calculate: Effect.fn("TaxKitMcpToolkit.taxkit_calculate")(
      (request) =>
        requestCalculation({ client, request }).pipe(
          Effect.catchTags({
            ...clientFailures,
            CalculationError: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "invalid-calculation",
                  retry: "check-input-before-retrying",
                })
              ),
            CalculatorAdmissionUnavailable: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "service-unavailable",
                  retry: "try-again-manually",
                })
              ),
            CalculatorCapacityExceeded: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "capacity-exceeded",
                  retry: "try-again-manually",
                })
              ),
            CalculatorOperationTimedOut: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "operation-timeout",
                  retry: "try-again-manually",
                })
              ),
            CalculatorRateLimited: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "rate-limited",
                  retry: "wait-then-try-manually",
                })
              ),
            CalculatorRequestBodyTimedOut: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "operation-timeout",
                  retry: "try-again-manually",
                })
              ),
            CalculatorRequestBodyTooLarge: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "invalid-calculation",
                  retry: "check-input-before-retrying",
                })
              ),
            InputValidationError: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "invalid-calculation",
                  retry: "check-input-before-retrying",
                })
              ),
            UnsupportedCalculatorContextError: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "invalid-calculation",
                  retry: "check-input-before-retrying",
                })
              ),
            UnsupportedCalculatorError: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "invalid-calculation",
                  retry: "check-input-before-retrying",
                })
              ),
          })
        )
    ),
    taxkit_docs_navigation: Effect.fn(
      "TaxKitMcpToolkit.taxkit_docs_navigation"
    )(() =>
      requestDocsNavigation(client).pipe(Effect.catchTags(clientFailures))
    ),
    taxkit_find_docs: Effect.fn("TaxKitMcpToolkit.taxkit_find_docs")(
      ({ term }) =>
        requestDocsSearch({ client, term }).pipe(
          Effect.map((results) => ({ results })),
          Effect.catchTags({
            ...clientFailures,
            DocsSearchUnavailable: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "service-unavailable",
                  retry: "try-again-manually",
                })
              ),
          })
        )
    ),
    taxkit_get_calculator_schema: Effect.fn(
      "TaxKitMcpToolkit.taxkit_get_calculator_schema"
    )((request) =>
      requestCalculatorSchema({ client, request }).pipe(
        Effect.catchTags({
          ...clientFailures,
          UnsupportedCalculatorContextError: () =>
            Effect.fail(
              new McpToolUnavailable({
                code: "not-found",
                retry: "check-input-before-retrying",
              })
            ),
        })
      )
    ),
    taxkit_list_calculators: Effect.fn(
      "TaxKitMcpToolkit.taxkit_list_calculators"
    )((query) =>
      requestCatalogue({ client, query }).pipe(Effect.catchTags(clientFailures))
    ),
    taxkit_read_doc: Effect.fn("TaxKitMcpToolkit.taxkit_read_doc")(({ path }) =>
      requestDocsPageAt({ client, path }).pipe(
        Effect.catchTags({
          ...clientFailures,
          DocsPageUnavailable: () =>
            Effect.fail(
              new McpToolUnavailable({
                code: "not-found",
                retry: "check-input-before-retrying",
              })
            ),
        })
      )
    ),
  });
