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
import {
  ByteSize,
  Duration,
  Effect,
  Match,
  Predicate,
  Schema,
  Stream,
} from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";
import type { HttpApiClient } from "effect/http-api";

import type { TaxKitApi } from "./api.js";
import {
  ApiDeadlineExceeded,
  ApiReplyMismatch,
  ApiReplyTooLarge,
  ApiUnavailable,
  CalculationCallFailure,
} from "./errors.js";
import type { ApiCallFailure } from "./errors.js";

/** The generated native client. Callers supply it; there is no replica service. */
export type TaxKitClient = HttpApiClient.ForApi<typeof TaxKitApi>;

/** Every complete read, including its decoded body, finishes within ten seconds. */
export const apiReadTimeout = Duration.seconds(10);
const apiReplyLimit = ByteSize.mebibytes(2);

/**
 * Read each reply into memory with a 2 MiB cap, keeping its real status and
 * headers so the generated client still decodes declared 4xx/5xx bodies. An
 * over-limit reply fails as a decode error carrying `ApiReplyTooLarge`.
 */
export const boundedReplies = (
  client: HttpClient.HttpClient
): HttpClient.HttpClient =>
  HttpClient.transformResponse(client, (effect) =>
    effect.pipe(
      Effect.flatMap((response) =>
        response.stream.pipe(
          Stream.mapAccumEffect(
            () => ByteSize.bytes(0),
            (total, chunk) => {
              const next = ByteSize.sum(
                total,
                ByteSize.bytes(chunk.byteLength)
              );
              return ByteSize.isGreaterThan(next, apiReplyLimit)
                ? Effect.fail(
                    new HttpClientError.HttpClientError({
                      reason: new HttpClientError.DecodeError({
                        cause: new ApiReplyTooLarge(),
                        request: response.request,
                        response,
                      }),
                    })
                  )
                : Effect.succeed([next, [chunk]] as const);
            }
          ),
          Stream.mkUint8Array,
          Effect.map((bytes) =>
            HttpClientResponse.fromWeb(
              response.request,
              new Response(new Uint8Array(bytes), {
                headers: response.headers,
                status: response.status,
              })
            )
          ),
          // A reply without a body (such as 204 or HEAD) passes unchanged.
          Effect.catchIf(
            (error) => Predicate.isTagged(error.reason, "EmptyBodyError"),
            () => Effect.succeed(response)
          )
        )
      )
    )
  );

// Transport, decoding and deadline failures have one safe meaning each. The
// bounded transport marks an over-limit reply with its named cause.
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- The transport reports several native error families; this callback immediately classifies them.
const transportFailure = <E>(error: E): ApiCallFailure => {
  if (Predicate.isTagged(error, "TimeoutError")) {
    return new ApiDeadlineExceeded();
  }
  return Predicate.isTagged(error, "HttpClientError") &&
    Predicate.hasProperty(error, "reason") &&
    Predicate.hasProperty(error.reason, "cause") &&
    Schema.is(ApiReplyTooLarge)(error.reason.cause)
    ? new ApiReplyTooLarge()
    : new ApiUnavailable();
};

// The route address is decoded once, here; an unknown address is a missing
// page. The reply must be the requested page.
export const requestDocsPage = Effect.fn("TaxKitApi.requestDocsPage")(
  (client: TaxKitClient, address: string) =>
    Schema.decodeUnknownEffect(DocsPublicPagePath)(address).pipe(
      Effect.mapError(
        () =>
          new DocsPageUnavailable({
            message: "The documentation page was not found.",
          })
      ),
      Effect.flatMap((path) => {
        // Resolve the client's default payload services before Effect.all's
        // contextual type can widen these bodyless requests to any.
        const navigation = client.content.getNavigation();
        const page = client.content.getPage({ query: { path } }).pipe(
          Effect.filterOrFail(
            (reply) => isRequestedDocsPage(path, reply),
            () => new ApiReplyMismatch()
          )
        );
        return Effect.all({ navigation, page }, { concurrency: 2 }).pipe(
          Effect.timeout(apiReadTimeout),
          Effect.mapError((error) =>
            Schema.is(DocsPageUnavailable)(error) ||
            Schema.is(ApiReplyMismatch)(error)
              ? error
              : transportFailure(error)
          )
        );
      })
    )
);

/** Navigation alone for an empty search, or navigation and matching pages. */
export const requestDocsSearch = Effect.fn("TaxKitApi.requestDocsSearch")((
  client: TaxKitClient,
  term: "" | DocsSearchTerm
) => {
  const navigation = client.content.getNavigation();
  const results =
    term === ""
      ? Effect.succeed([])
      : client.content.searchPages({ query: { term } });
  return Effect.all({ navigation, results }, { concurrency: 2 }).pipe(
    Effect.timeout(apiReadTimeout),
    Effect.mapError((error) =>
      Schema.is(DocsSearchUnavailable)(error) ? error : transportFailure(error)
    )
  );
});

export const requestDocsMarkdown = Effect.fn("TaxKitApi.requestDocsMarkdown")(
  (client: TaxKitClient, path: DocsPagePath) =>
    client.content.getMarkdown({ query: { path } }).pipe(
      Effect.timeout(apiReadTimeout),
      Effect.mapError((error) =>
        Schema.is(DocsPageUnavailable)(error) ? error : transportFailure(error)
      )
    )
);

export const requestCatalogue = Effect.fn("TaxKitApi.requestCatalogue")(
  (client: TaxKitClient) =>
    client.calculatorApi
      .listCalculators({ query: MetadataQuery.make({}) })
      .pipe(Effect.timeout(apiReadTimeout), Effect.mapError(transportFailure))
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

export const requestCalculation = Effect.fn("TaxKitApi.requestCalculation")(
  function* (client: TaxKitClient, request: CalculatorRunServiceRequest) {
    const response = yield* client.calculatorApi
      .calculate({
        params: { calculatorId: request.calculatorId },
        payload: request.payload,
        query: CalculationQuery.make({ help: request.help }),
      })
      .pipe(
        Effect.timeout(apiReadTimeout),
        // Declared calculator failures arrive as `{ error }` envelopes.
        Effect.mapError((error): CalculationCallFailure =>
          Predicate.hasProperty(error, "error") &&
          Schema.is(CalculationCallFailure)(error.error)
            ? error.error
            : transportFailure(error)
        )
      );
    if (!answers(request, response)) {
      return yield* new ApiReplyMismatch();
    }
    return response;
  }
);
