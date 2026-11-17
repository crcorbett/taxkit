import { CalculatorId } from "@taxkit/calculators/schemas";
import type {
  CalculatorRunRequest,
  GetCalculatorRequest,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { DocsPageUnavailable } from "@taxkit/content/errors";
import { isRequestedDocsPage } from "@taxkit/content/response-check";
import { DocsPublicPagePath } from "@taxkit/content/schemas";
import type { DocsPagePath, DocsSearchTerm } from "@taxkit/content/schemas";
import {
  ByteSize,
  Duration,
  Effect,
  Match,
  Predicate,
  Schema,
  Stream,
  Boolean as EffectBoolean,
} from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";
import type { HttpApiClient } from "effect/http-api";

import type { TaxKitApi } from "./api.js";
import {
  ApiDeadlineExceeded,
  ApiReplyMismatch,
  ApiReplyTooLarge,
  ApiUnavailable,
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
              return EffectBoolean.match(
                ByteSize.isGreaterThan(next, apiReplyLimit),
                {
                  onFalse: () => Effect.succeed([next, [chunk]] as const),
                  onTrue: () =>
                    Effect.fail(
                      new HttpClientError.HttpClientError({
                        reason: new HttpClientError.DecodeError({
                          cause: new ApiReplyTooLarge(),
                          request: response.request,
                          response,
                        }),
                      })
                    ),
                }
              );
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
// The generated client's own failure families have one safe meaning each.
// A request that never got an answer means the service is unavailable, as
// does a 5xx reply without a readable declared body (such as an edge outage
// page or a defect). Any other reply that cannot be read as the declared
// Schema does not match the contract: a server fault, not an outage. The
// bounded transport marks an over-limit reply with its named decode cause.
const unreadableReply = ({
  cause,
  response,
}:
  | HttpClientError.DecodeError
  | HttpClientError.StatusCodeError
  | HttpClientError.EmptyBodyError): ApiCallFailure =>
  Match.value({
    oversize: Schema.is(ApiReplyTooLarge)(cause),
    status: response.status,
  }).pipe(
    Match.when({ oversize: true }, () => new ApiReplyTooLarge()),
    Match.when(
      { status: (status) => status >= 500 },
      () => new ApiUnavailable()
    ),
    Match.orElse(() => new ApiReplyMismatch())
  );
const transportFailures = {
  HttpClientError: ({ reason }: HttpClientError.HttpClientError) =>
    Effect.fail(
      Match.value(reason).pipe(
        Match.tagsExhaustive({
          DecodeError: unreadableReply,
          EmptyBodyError: unreadableReply,
          EncodeError: (): ApiCallFailure => new ApiUnavailable(),
          InvalidUrlError: (): ApiCallFailure => new ApiUnavailable(),
          StatusCodeError: unreadableReply,
          TransportError: (): ApiCallFailure => new ApiUnavailable(),
        })
      )
    ),
  // Every request input is already a value of the endpoint's own Schema, so
  // encoding cannot fail; a SchemaError is a reply body that does not match.
  SchemaError: () => Effect.fail(new ApiReplyMismatch()),
};
// Every complete read, including decoding, shares the same deadline failure.
const withinReadDeadline = Effect.timeoutOrElse({
  duration: apiReadTimeout,
  orElse: () => Effect.fail(new ApiDeadlineExceeded()),
});
// The route address is decoded once, here; an unknown address is a missing
// page. The reply must be the requested page.
export const requestDocsPage = Effect.fn("TaxKitApi.requestDocsPage")(
  ({
    client,
    address,
  }: {
    readonly client: TaxKitClient;
    readonly address: string;
  }) =>
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
          withinReadDeadline,
          Effect.catchTags(transportFailures)
        );
      })
    )
);
/** Matching pages only; an empty search performs no HTTP request. */
export const requestDocsSearch = Effect.fn("TaxKitApi.requestDocsSearch")(
  ({
    client,
    term,
  }: {
    readonly client: TaxKitClient;
    readonly term: "" | DocsSearchTerm;
  }) =>
    Match.value(term).pipe(
      Match.when("", () => Effect.succeed([])),
      Match.orElse((matchedValue) =>
        client.content.searchPages({ query: { term: matchedValue } })
      ),
      withinReadDeadline,
      Effect.catchTags(transportFailures)
    )
);
export const requestDocsMarkdown = Effect.fn("TaxKitApi.requestDocsMarkdown")(
  ({
    client,
    path,
  }: {
    readonly client: TaxKitClient;
    readonly path: DocsPagePath;
  }) =>
    client.content
      .getMarkdown({ query: { path } })
      .pipe(withinReadDeadline, Effect.catchTags(transportFailures))
);
export const requestCatalogue = Effect.fn("TaxKitApi.requestCatalogue")(
  ({
    client,
    query,
  }: {
    readonly client: TaxKitClient;
    readonly query: MetadataQuery;
  }) =>
    client.calculatorApi
      .listCalculators({ query })
      .pipe(withinReadDeadline, Effect.catchTags(transportFailures))
);
/** One calculator's schema metadata; a lookup failure arrives unwrapped. */
export const requestCalculatorSchema = Effect.fn(
  "TaxKitApi.requestCalculatorSchema"
)(
  ({
    client,
    request: { calculatorId, ...query },
  }: {
    readonly client: TaxKitClient;
    readonly request: GetCalculatorRequest;
  }) =>
    client.calculatorApi
      .getCalculatorSchema({ params: { calculatorId }, query })
      .pipe(
        // The declared lookup failure arrives as an untagged `{ error }` envelope.
        Effect.catchTags(transportFailures, ({ error }) => Effect.fail(error)),
        withinReadDeadline
      )
);
export const requestDocsNavigation = Effect.fn(
  "TaxKitApi.requestDocsNavigation"
)((client: TaxKitClient) =>
  client.content
    .getNavigation()
    .pipe(withinReadDeadline, Effect.catchTags(transportFailures))
);
/** One checked page address, without navigation; the reply must be that page. */
export const requestDocsPageAt = Effect.fn("TaxKitApi.requestDocsPageAt")(
  ({
    client,
    path,
  }: {
    readonly client: TaxKitClient;
    readonly path: DocsPublicPagePath;
  }) =>
    client.content.getPage({ query: { path } }).pipe(
      Effect.filterOrFail(
        (reply) => isRequestedDocsPage(path, reply),
        () => new ApiReplyMismatch()
      ),
      withinReadDeadline,
      Effect.catchTags(transportFailures)
    )
);
export const requestCalculation = Effect.fn("TaxKitApi.requestCalculation")(
  function* ({
    client,
    request,
  }: {
    readonly client: TaxKitClient;
    readonly request: CalculatorRunRequest;
  }) {
    const response = yield* client.calculatorApi
      .calculate({
        params: { calculatorId: CalculatorId.make(request.calculatorId) },
        payload: request,
      })
      .pipe(
        // Declared calculator failures arrive as untagged `{ error }`
        // envelopes: every failure without a transport tag is one.
        Effect.catchTags(transportFailures, ({ error }) => Effect.fail(error)),
        withinReadDeadline
      );
    // The decoded tagged union ties each report kind to its calculator ID, so
    // the reply answers this request exactly when the IDs agree.
    if (response.calculatorId !== request.calculatorId) {
      return yield* new ApiReplyMismatch();
    }
    return response;
  }
);
