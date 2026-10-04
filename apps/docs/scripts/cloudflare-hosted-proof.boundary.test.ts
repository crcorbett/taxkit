import { expect, it } from "@effect/vitest";
import {
  ConfigProvider,
  Deferred,
  Effect,
  Fiber,
  Layer,
  Match,
  Ref,
  Result,
  Schema,
} from "effect";

import {
  CloudflareHostedProof,
  HostedProofConfigurationError,
  HostedProofEvidenceError,
  HostedProofExecutionError,
  HostedProofProbe,
  runCloudflareHostedProof,
} from "./cloudflare-hosted-proof.boundary.js";

const validConfig = {
  TAXKIT_DOCS_ACCOUNT_ID: "b".repeat(32),
  TAXKIT_DOCS_CANDIDATE_COMMIT: "a".repeat(40),
  TAXKIT_DOCS_CONFIG_SHA256: "c".repeat(64),
  TAXKIT_DOCS_DEPLOYMENT_ID: "deployment-pr-24",
  TAXKIT_DOCS_DEPLOYMENT_INPUT_SHA256: "d".repeat(64),
  TAXKIT_DOCS_ENVIRONMENT: "preview",
  TAXKIT_DOCS_EVIDENCE_DIRECTORY: "docs/evidence/deployments/preview-pr-24",
  TAXKIT_DOCS_HOSTED_PROPAGATION_ATTEMPTS: "6",
  TAXKIT_DOCS_HOSTED_PROPAGATION_DELAY_MS: "2000",
  TAXKIT_DOCS_HOSTED_URL: "https://taxkit-docs-pr-24.workers.dev",
  TAXKIT_DOCS_LOCKFILE_SHA256: "e".repeat(64),
  TAXKIT_DOCS_PLAN_SHA256: "f".repeat(64),
  TAXKIT_DOCS_PREVIEW_PR_NUMBER: "24",
  TAXKIT_DOCS_PREVIOUS_VERSION_ID: "previous-version",
  TAXKIT_DOCS_ROLLBACK_RECOVERY_IDENTITY: "preview-42",
  TAXKIT_DOCS_STAGE: "pr-24",
  TAXKIT_DOCS_STATE_STORE_ID: "alchemy-state-store",
  TAXKIT_DOCS_VERSION_ID: "version-pr-24",
  TAXKIT_DOCS_WORKER_NAME: "taxkit-docs-pr-24",
} as const;

const Input = Schema.Record(Schema.String, Schema.UndefinedOr(Schema.String));
const Counts = Schema.Struct({
  closed: Schema.Int,
  launched: Schema.Int,
  ran: Schema.Int,
});
const Outcome = Schema.Literals([
  "success",
  "failure",
  "asset-propagation",
  "interruption",
  "invalid-evidence",
]);

const probe = Schema.decodeEffect(HostedProofProbe)({
  accessibility: {
    contrastRatio: 7,
    labelledArticle: true,
    labelledMain: true,
    labelledNavigation: true,
    skipLinkFocus: true,
  },
  asset: {
    cacheControl: "public, max-age=31536000, immutable",
    contentType: "text/javascript",
    etagPresent: true,
    path: "/assets/route-ABC123xy.js",
    status: 200,
  },
  assetPropagationRetries: 0,
  browser: { name: "chromium", version: "controlled-fixture" },
  diagnostics: [],
  direct404: 404,
  initialSsr: 200,
  malformedServerFunctionStatus: 400,
  navigation: {
    client404WithoutDocumentReload: true,
    documentRequestsAdded: 0,
    serverFunctionResponses: 1,
  },
  runtime: {
    constructionCounts: [1, 1],
    firstIsolate: "fixture-isolate",
    sameObservedIsolate: true,
    secondIsolate: "fixture-isolate",
  },
  screenshots: [
    {
      kind: "desktop",
      path: "docs/evidence/deployments/preview-pr-24/preview-desktop-aaaaaaa.png",
      sha256: "a".repeat(64),
      viewport: { deviceScaleFactor: 1, height: 1000, width: 1440 },
    },
    {
      kind: "mobile",
      path: "docs/evidence/deployments/preview-pr-24/preview-mobile-aaaaaaa.png",
      sha256: "b".repeat(64),
      viewport: { deviceScaleFactor: 1, height: 844, width: 390 },
    },
  ],
} as const);

// The test Layer has the same closed operations as the live browser adapter.
// Its explicit outcomes exercise configuration, scope and egress behaviour.
const makeFixture = Effect.fnUntraced(function* (
  outcome: typeof Outcome.Type = "success"
) {
  const counts = yield* Ref.make<typeof Counts.Type>({
    closed: 0,
    launched: 0,
    ran: 0,
  });
  const started = yield* Deferred.make<boolean>();
  const checkedProbe = yield* probe;
  const layer = Layer.succeed(
    CloudflareHostedProof,
    CloudflareHostedProof.of({
      verifyAssetPropagation: () =>
        Effect.fail(
          new HostedProofExecutionError({ operation: "browser-proof" })
        ),
      verifyHostedDeployment: () =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Ref.update(counts, (value) => ({
              ...value,
              launched: value.launched + 1,
            })),
            () =>
              Ref.update(counts, (value) => ({
                ...value,
                closed: value.closed + 1,
              }))
          );
          yield* Ref.update(counts, (value) => ({
            ...value,
            ran: value.ran + 1,
          }));
          yield* Deferred.succeed(started, true);
          return yield* Match.value(outcome).pipe(
            Match.when("failure", () =>
              Effect.fail(
                new HostedProofExecutionError({ operation: "browser-proof" })
              )
            ),
            Match.when("asset-propagation", () =>
              Effect.fail(
                new HostedProofExecutionError({
                  operation: "asset-propagation",
                })
              )
            ),
            Match.when("interruption", () => Effect.never),
            Match.when("invalid-evidence", () =>
              Effect.succeed({
                ...checkedProbe,
                accessibility: {
                  ...checkedProbe.accessibility,
                  contrastRatio: Number.NaN,
                },
              })
            ),
            Match.when("success", () => Effect.succeed(checkedProbe)),
            Match.exhaustive
          );
        }).pipe(Effect.scoped),
    })
  );
  return { counts, layer, started } as const;
});

const configured = (
  layer: Layer.Layer<CloudflareHostedProof>,
  config: typeof Input.Type = validConfig
) =>
  runCloudflareHostedProof.pipe(
    Effect.provide(layer),
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown(config)
    )
  );

const invalidInputs = [
  ["missing input", { TAXKIT_DOCS_HOSTED_URL: undefined }],
  ["empty input", { TAXKIT_DOCS_DEPLOYMENT_ID: "" }],
  [
    "malformed URL",
    { TAXKIT_DOCS_HOSTED_URL: "https://taxkit-docs-pr-24.workers.dev/path" },
  ],
  ["invalid digest", { TAXKIT_DOCS_PLAN_SHA256: "f".repeat(63) }],
  ["invalid stage", { TAXKIT_DOCS_STAGE: "pr-0" }],
  ["prefix numeric", { TAXKIT_DOCS_PREVIEW_PR_NUMBER: "24x" }],
  ["zero numeric", { TAXKIT_DOCS_HOSTED_PROPAGATION_DELAY_MS: "0" }],
  ["out-of-range numeric", { TAXKIT_DOCS_HOSTED_PROPAGATION_ATTEMPTS: "21" }],
  [
    "unsafe path",
    {
      TAXKIT_DOCS_EVIDENCE_DIRECTORY:
        "docs/evidence/deployments/preview-pr-24/../secret",
    },
  ],
] as const;

it.effect.each(invalidInputs)(
  "rejects %s before browser acquisition",
  ([, override]) =>
    Effect.gen(function* () {
      const fixture = yield* makeFixture();
      const result = yield* configured(fixture.layer, {
        ...validConfig,
        ...override,
      }).pipe(Effect.result);
      expect(yield* Ref.get(fixture.counts)).toEqual({
        closed: 0,
        launched: 0,
        ran: 0,
      });
      expect(result).toEqual(
        Result.fail(
          new HostedProofConfigurationError({
            requirement: "environment-input",
          })
        )
      );
    })
);

it.effect(
  "rejects a mismatched environment and stage before browser acquisition",
  () =>
    Effect.gen(function* () {
      const fixture = yield* makeFixture();
      const result = yield* configured(fixture.layer, {
        ...validConfig,
        TAXKIT_DOCS_ENVIRONMENT: "production",
      }).pipe(Effect.result);
      expect(yield* Ref.get(fixture.counts)).toEqual({
        closed: 0,
        launched: 0,
        ran: 0,
      });
      expect(result).toEqual(
        Result.fail(
          new HostedProofConfigurationError({
            requirement: "environment-stage-identity",
          })
        )
      );
    })
);
it.effect(
  "closes the browser after success and preserves the complete observation",
  () =>
    Effect.gen(function* () {
      const fixture = yield* makeFixture();
      const encoded = yield* configured(fixture.layer);
      const observation = yield* Schema.decodeEffect(
        Schema.fromJsonString(Schema.Record(Schema.String, Schema.Json))
      )(encoded);
      expect(observation).toMatchObject({
        candidateCommit: validConfig.TAXKIT_DOCS_CANDIDATE_COMMIT,
        previewPrNumber: 24,
        previousVersionId: "previous-version",
        ...(yield* probe),
      });
      expect(yield* Ref.get(fixture.counts)).toEqual({
        closed: 1,
        launched: 1,
        ran: 1,
      });
    })
);
it.effect.each(["failure", "asset-propagation"] as const)(
  "closes the browser after %s",
  (outcome) =>
    Effect.gen(function* () {
      const fixture = yield* makeFixture(outcome);
      const result = yield* configured(fixture.layer).pipe(Effect.result);
      expect(yield* Ref.get(fixture.counts)).toEqual({
        closed: 1,
        launched: 1,
        ran: 1,
      });
      expect(result).toEqual(
        Result.fail(
          new HostedProofExecutionError({
            operation:
              outcome === "failure" ? "browser-proof" : "asset-propagation",
          })
        )
      );
    })
);
it.effect("closes the browser after interruption", () =>
  Effect.gen(function* () {
    const fixture = yield* makeFixture("interruption");
    const fiber = yield* configured(fixture.layer).pipe(
      Effect.forkChild({ startImmediately: true })
    );
    yield* Deferred.await(fixture.started);
    yield* Fiber.interrupt(fiber);
    expect(yield* Ref.get(fixture.counts)).toEqual({
      closed: 1,
      launched: 1,
      ran: 1,
    });
  })
);
it.effect("keeps configuration and evidence errors secret-negative", () =>
  Effect.gen(function* () {
    const secret = "private-token-value";
    const invalid = yield* makeFixture();
    const invalidResult = yield* configured(invalid.layer, {
      ...validConfig,
      TAXKIT_DOCS_HOSTED_URL: `https://taxkit-docs-pr-24.workers.dev/?token=${secret}`,
    }).pipe(Effect.result);
    const invalidJson = yield* Schema.encodeEffect(
      Schema.fromJsonString(Schema.Unknown)
    )(invalidResult);
    expect(invalidJson).not.toContain(secret);
    const evidence = yield* makeFixture("invalid-evidence");
    const result = yield* configured(evidence.layer).pipe(Effect.result);
    expect(result).toEqual(
      Result.fail(
        new HostedProofEvidenceError({ operation: "encode-observation" })
      )
    );
    expect(yield* Ref.get(evidence.counts)).toEqual({
      closed: 1,
      launched: 1,
      ran: 1,
    });
  })
);

it.effect.each(["production", "rollback"] as const)(
  "keeps absent optional metadata as historical null values for %s",
  (environment) =>
    Effect.gen(function* () {
      const fixture = yield* makeFixture();
      const encoded = yield* configured(fixture.layer, {
        ...validConfig,
        TAXKIT_DOCS_ENVIRONMENT: environment,
        TAXKIT_DOCS_PREVIEW_PR_NUMBER: undefined,
        TAXKIT_DOCS_PREVIOUS_VERSION_ID:
          environment === "production" ? undefined : "",
        TAXKIT_DOCS_STAGE: "prod",
      });
      const observation = yield* Schema.decodeEffect(
        Schema.fromJsonString(Schema.Record(Schema.String, Schema.Json))
      )(encoded);
      expect(observation).toMatchObject({
        environment,
        previewPrNumber: null,
        previousVersionId: null,
        stage: "prod",
      });
      expect(yield* Ref.get(fixture.counts)).toEqual({
        closed: 1,
        launched: 1,
        ran: 1,
      });
    })
);
