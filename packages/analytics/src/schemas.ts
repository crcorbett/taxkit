import {
  CalculatorId,
  CalculatorCatalogItem,
} from "@taxkit/calculators/schemas";
import { DocsPublicPagePath } from "@taxkit/content/schemas";
import { Schema } from "effect";

export const PostHogProjectId = Schema.Int.check(Schema.isGreaterThan(0)).pipe(
  Schema.brand("taxkit/PostHogProjectId")
);
export type PostHogProjectId = typeof PostHogProjectId.Type;
export const CaptureToken = Schema.String.check(
  Schema.isPattern(/^phc_[A-Za-z0-9_-]{20,160}$/u)
).pipe(Schema.brand("taxkit/PublicCaptureToken"));
export const CaptureStage = Schema.String.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^(?:prod|pr-[1-9]\d*)$/u)
).pipe(Schema.brand("taxkit/AnalyticsCaptureStage"));
export const AnalyticsDisabled = Schema.TaggedStruct("AnalyticsDisabled", {});
export const AnalyticsEnabled = Schema.TaggedStruct("AnalyticsEnabled", {
  environment: Schema.Literals(["production", "controlled-preview"]),
  projectId: PostHogProjectId,
  region: Schema.Literal("us"),
  stage: CaptureStage,
  token: Schema.RedactedFromValue(CaptureToken),
}).check(
  Schema.makeFilter(
    (settings) =>
      settings.environment === "production"
        ? settings.stage === "prod"
        : settings.stage !== "prod",
    {
      message:
        "The analytics environment must match its checked deployment stage.",
    }
  )
);
export const AnalyticsSettings = Schema.Union([
  AnalyticsDisabled,
  AnalyticsEnabled,
]);
export type AnalyticsSettings = typeof AnalyticsSettings.Type;
export const CollectionPolicy = Schema.Literals(["allow", "deny"]);
export type CollectionPolicy = typeof CollectionPolicy.Type;
export const CollectionPolicyHeader = "x-taxkit-collection-policy";
export const CaptureDisposition = Schema.Literals([
  "accepted",
  "disabled",
  "denied",
]);
export type CaptureDisposition = typeof CaptureDisposition.Type;
export const EventId = Schema.String.check(Schema.isUUID(4)).pipe(
  Schema.brand("taxkit/AnalyticsEventId")
);
export const CalculatorAnalyticsName = CalculatorCatalogItem.fields.title
  .check(Schema.isMinLength(1), Schema.isMaxLength(120))
  .pipe(Schema.brand("taxkit/CalculatorAnalyticsName"));
export const CalculatorUse = Schema.Struct({
  calculatorId: CalculatorId,
  calculatorName: CalculatorAnalyticsName,
  collectionPolicy: CollectionPolicy,
});
export type CalculatorUse = typeof CalculatorUse.Type;
export const PagePath = Schema.Union([
  Schema.Literal("/"),
  DocsPublicPagePath,
  Schema.TemplateLiteral(["/calculators/", CalculatorId]),
]).pipe(Schema.brand("taxkit/AnalyticsPagePath"));
export const PageView = Schema.Struct({
  path: PagePath,
  source: Schema.Literals([
    "direct",
    "internal",
    "search",
    "external",
    "unknown",
  ]),
});
export type PageView = typeof PageView.Type;

// Capture, browser enrichment and provider management keep distinct boundaries.
// This backend wire owner includes no tax inputs, result, visitor or request data.
export const CalculatorCaptureBatch = Schema.Struct({
  api_key: CaptureToken,
  batch: Schema.Tuple([
    Schema.Struct({
      distinct_id: EventId,
      event: Schema.Literal("calculator_used"),
      properties: Schema.Struct({
        $geoip_disable: Schema.Literal(true),
        $process_person_profile: Schema.Literal(false),
        application: Schema.Literal("api"),
        calculator_id: CalculatorUse.fields.calculatorId,
        calculator_name: CalculatorUse.fields.calculatorName,
        project: Schema.Literal("taxkit"),
        schema_version: Schema.Literal(1),
        stage: CaptureStage,
      }),
      timestamp: Schema.DateTimeUtcFromString,
      uuid: EventId,
    }),
  ]),
});
export const CaptureResponseByteLimit = 65_536;
