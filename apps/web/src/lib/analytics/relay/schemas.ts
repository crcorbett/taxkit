import { Array, Schema, SchemaGetter } from "effect";

export const WebsiteRelayPath = "/ingest/e/";
export const WebsiteRelayByteLimit = 65_536;
export const WebsiteRelayMediaType = Schema.String.check(
  Schema.isMaxLength(80),
  Schema.isPattern(
    /^(?:application\/json|text\/plain)(?:;[\t ]*charset=(?:UTF-8|utf-8))?$/u
  )
);
const WebsiteRelayRetryCount = Schema.String.check(
  Schema.isPattern(/^(?:[0-9]|10)$/u)
).pipe(Schema.brand("taxkit/WebsiteRelayRetryCount"));
const WebsiteRelayQueryFields = Schema.Struct({
  retry_count: Schema.OptionFromOptional(WebsiteRelayRetryCount),
});
// The qualified fetch profile sends gzip or its JSON fallback without a
// compression query. Only the SDK's bounded retry counter is admitted here.
export const WebsiteRelayQuery = Schema.String.check(
  Schema.isMaxLength(80),
  Schema.makeFilter((raw) => {
    const query = new URLSearchParams(raw);
    return (
      query.getAll("retry_count").length <= 1 &&
      Array.every(
        Array.fromIterable(query.keys()),
        (key) => key === "retry_count"
      )
    );
  })
).pipe(
  Schema.decodeTo(WebsiteRelayQueryFields, {
    decode: SchemaGetter.transform((raw) => ({
      retry_count: new URLSearchParams(raw).get("retry_count") ?? undefined,
    })),
    encode: SchemaGetter.forbidden(() => "Relay query is ingress only."),
  })
);
export const WebsiteRelayRetryAfter = Schema.String.check(
  Schema.isPattern(/^(?:0|[1-9]\d{0,3})$/u),
  Schema.makeFilter((value) => Number(value) <= 3600)
).pipe(Schema.brand("taxkit/WebsiteRelayRetryAfterSeconds"));
