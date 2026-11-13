import { PublicCalculatorService } from "@taxkit/calculators/service";
import { ContentService } from "@taxkit/content/service";
import { Effect } from "effect";
import type { Layer } from "effect";
import type { Tool, Toolkit } from "effect/ai";

import { withMcpRequestCancellation } from "./cancellation.boundary.js";
import { McpToolUnavailable } from "./errors.js";
import { TaxKitMcpToolkit } from "./tools.js";

export const TaxKitMcpHandlersLive: Layer.Layer<
  Tool.HandlersFor<Toolkit.Tools<typeof TaxKitMcpToolkit>>,
  never,
  PublicCalculatorService | ContentService
> = TaxKitMcpToolkit.toLayer(
  Effect.gen(function* () {
    const calculator = yield* PublicCalculatorService;
    const content = yield* ContentService;
    return TaxKitMcpToolkit.of({
      taxkit_calculate: Effect.fn("TaxKitMcpToolkit.taxkit_calculate")(
        (request) =>
          calculator.calculate(request).pipe(
            Effect.catchTags({
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
            }),
            withMcpRequestCancellation
          )
      ),
      taxkit_docs_navigation: Effect.fn(
        "TaxKitMcpToolkit.taxkit_docs_navigation"
      )(() => content.getNavigation().pipe(withMcpRequestCancellation)),
      taxkit_find_docs: Effect.fn("TaxKitMcpToolkit.taxkit_find_docs")(
        ({ term }) =>
          content.searchPages(term).pipe(
            Effect.map((results) => ({ results })),
            Effect.catchTags({
              DocsSourceError: () =>
                Effect.fail(
                  new McpToolUnavailable({
                    code: "service-unavailable",
                    retry: "try-again-manually",
                  })
                ),
            }),
            withMcpRequestCancellation
          )
      ),
      taxkit_get_calculator_schema: Effect.fn(
        "TaxKitMcpToolkit.taxkit_get_calculator_schema"
      )((request) =>
        calculator.getCalculatorSchema(request).pipe(
          Effect.catchTags({
            UnsupportedCalculatorContextError: () =>
              Effect.fail(
                new McpToolUnavailable({
                  code: "not-found",
                  retry: "check-input-before-retrying",
                })
              ),
          }),
          withMcpRequestCancellation
        )
      ),
      taxkit_list_calculators: Effect.fn(
        "TaxKitMcpToolkit.taxkit_list_calculators"
      )((query) =>
        calculator.listCalculators(query).pipe(withMcpRequestCancellation)
      ),
      taxkit_read_doc: Effect.fn("TaxKitMcpToolkit.taxkit_read_doc")(
        ({ path }) =>
          content.getPage(path).pipe(
            Effect.catchTags({
              DocsPageNotFoundError: () =>
                Effect.fail(
                  new McpToolUnavailable({
                    code: "not-found",
                    retry: "check-input-before-retrying",
                  })
                ),
            }),
            withMcpRequestCancellation
          )
      ),
    });
  })
);
