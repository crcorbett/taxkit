import type { TaxKitApi } from "@taxkit/api-http/api";
import { CalculationQuery, MetadataQuery } from "@taxkit/calculators/schemas";
import type { CalculatorRunServiceRequest } from "@taxkit/calculators/schemas";
import {
  DocsPageUnavailable,
  DocsSearchUnavailable,
} from "@taxkit/content/errors";
import { isRequestedDocsPage } from "@taxkit/content/response-check";
import { DocsPublicPagePath } from "@taxkit/content/schemas";
import type { DocsPagePath, DocsSearchTerm } from "@taxkit/content/schemas";
import { AnnualTaxReport } from "@taxkit/rules-au-income-tax/schemas";
import {
  PayWithholdingsLedger,
  TakeHomePayReport,
} from "@taxkit/rules-au-pay/schemas";
import { Effect, Match, Predicate, Schema } from "effect";
import type { HttpApiClient } from "effect/http-api";

import { websiteApiDeadline } from "./bounded-response";
import {
  WebsiteApiDeadlineExceeded,
  WebsiteApiMismatch,
  WebsiteApiResponseTooLarge,
  WebsiteApiUnavailable,
  WebsiteCalculationFailure,
  WebsiteDocsPageMismatch,
} from "./errors";
import type { WebsiteApiFailure } from "./errors";

/** The generated native client, used directly by server and browser code. */
export type TaxKitClient = HttpApiClient.ForApi<typeof TaxKitApi>;

// Transport, decoding and deadline failures have one safe Website meaning.
// The bounded adapter marks an over-limit reply with its named cause.
const transportFailure = <E>(error: E): WebsiteApiFailure => {
  if (Predicate.isTagged(error, "TimeoutError")) {
    return new WebsiteApiDeadlineExceeded();
  }
  return Predicate.isTagged(error, "HttpClientError") &&
    Predicate.hasProperty(error, "reason") &&
    Predicate.hasProperty(error.reason, "cause") &&
    Schema.is(WebsiteApiResponseTooLarge)(error.reason.cause)
    ? new WebsiteApiResponseTooLarge()
    : new WebsiteApiUnavailable();
};

// The route address is decoded once, here; an unknown address is a missing
// page. One deadline covers headers, body and decoding of each generated call.
export const readDocsPage = (client: TaxKitClient, address: string) =>
  Schema.decodeUnknownEffect(DocsPublicPagePath)(address).pipe(
    Effect.mapError(
      () =>
        new DocsPageUnavailable({
          message: "The documentation page was not found.",
        })
    ),
    Effect.flatMap((path) =>
      Effect.all(
        {
          navigation: client.content.getNavigation(),
          page: client.content.getPage({ query: { path } }).pipe(
            Effect.filterOrFail(
              (page) => isRequestedDocsPage(path, page),
              () => new WebsiteDocsPageMismatch()
            )
          ),
        },
        { concurrency: 2 }
      ).pipe(
        Effect.timeout(websiteApiDeadline),
        Effect.mapError((error) =>
          Schema.is(DocsPageUnavailable)(error) ||
          Schema.is(WebsiteDocsPageMismatch)(error)
            ? error
            : transportFailure(error)
        )
      )
    )
  );

const readDocsNavigation = (client: TaxKitClient) =>
  client.content
    .getNavigation()
    .pipe(
      Effect.timeout(websiteApiDeadline),
      Effect.mapError(transportFailure)
    );

const searchDocs = (client: TaxKitClient, term: DocsSearchTerm) =>
  Effect.all(
    {
      navigation: client.content.getNavigation(),
      results: client.content.searchPages({ query: { term } }),
    },
    { concurrency: 2 }
  ).pipe(
    Effect.timeout(websiteApiDeadline),
    Effect.mapError((error) =>
      Schema.is(DocsSearchUnavailable)(error) ? error : transportFailure(error)
    )
  );

export const readDocsSearch = (
  client: TaxKitClient,
  term: "" | DocsSearchTerm
) =>
  term === ""
    ? readDocsNavigation(client).pipe(
        Effect.map((navigation) => ({ navigation, results: [] }))
      )
    : searchDocs(client, term);

export const readDocsMarkdown = (client: TaxKitClient, path: DocsPagePath) =>
  client.content.getMarkdown({ query: { path } }).pipe(
    Effect.timeout(websiteApiDeadline),
    Effect.mapError((error) =>
      Schema.is(DocsPageUnavailable)(error) ? error : transportFailure(error)
    )
  );

export const readCatalogue = (client: TaxKitClient) =>
  client.calculatorApi
    .listCalculators({ query: MetadataQuery.make({}) })
    .pipe(
      Effect.timeout(websiteApiDeadline),
      Effect.mapError(transportFailure)
    );

// The reply must answer this calculator with its own report kind.
const answers = (
  request: CalculatorRunServiceRequest,
  response: Readonly<{
    calculator: Readonly<{ calculatorId: string }>;
    report: unknown;
  }>
) =>
  response.calculator.calculatorId === request.calculatorId &&
  Match.value(request.calculatorId).pipe(
    Match.when("au.income-tax.annual", () =>
      Schema.is(AnnualTaxReport)(response.report)
    ),
    Match.when("au.pay.take-home", () =>
      Schema.is(TakeHomePayReport)(response.report)
    ),
    Match.when("au.pay.withholdings", () =>
      Schema.is(PayWithholdingsLedger)(response.report)
    ),
    Match.orElse(() => false)
  );

export const calculate = Effect.fn("Website.calculate")(function* (
  client: TaxKitClient,
  request: CalculatorRunServiceRequest
) {
  const response = yield* client.calculatorApi
    .calculate({
      params: { calculatorId: request.calculatorId },
      payload: request.payload,
      query: CalculationQuery.make({ help: request.help }),
    })
    .pipe(
      Effect.timeout(websiteApiDeadline),
      // Declared calculator failures arrive as `{ error }` envelopes.
      Effect.mapError((error): WebsiteCalculationFailure =>
        Predicate.hasProperty(error, "error") &&
        Schema.is(WebsiteCalculationFailure)(error.error)
          ? error.error
          : transportFailure(error)
      )
    );
  if (!answers(request, response)) {
    return yield* new WebsiteApiMismatch();
  }
  return response;
});
