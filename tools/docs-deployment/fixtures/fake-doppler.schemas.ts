import { Schema } from "effect";

const FakeEnvironmentFields = {
  CLOUDFLARE_ACCOUNT_ID: Schema.optional(Schema.String),
  CLOUDFLARE_API_TOKEN: Schema.optional(Schema.String),
  DOPPLER_CONFIG: Schema.optional(Schema.String),
  DOPPLER_PROJECT: Schema.optional(Schema.String),
  DOPPLER_TOKEN: Schema.optional(Schema.String),
  TAXKIT_DOPPLER_TEST_MARKER: Schema.String,
};

export const FakeDopplerReceipt = Schema.Struct({
  arguments: Schema.Array(Schema.String),
  environment: Schema.Struct(FakeEnvironmentFields),
});

export const FakeDopplerConfig = Schema.Struct({
  ...FakeEnvironmentFields,
  TAXKIT_DOPPLER_TEST_EXIT_CODE: Schema.NumberFromString.pipe(
    Schema.check(Schema.isInt(), Schema.isBetween({ maximum: 1, minimum: 0 }))
  ),
  TAXKIT_DOPPLER_TEST_RECEIPT: Schema.NonEmptyString,
});

export class FakeDopplerExitError extends Schema.TaggedError<FakeDopplerExitError>()(
  "FakeDopplerExitError",
  { code: Schema.Literal(1) }
) {}
