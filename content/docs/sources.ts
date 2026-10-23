import apiAgentTools from "./api/agent-tools.mdx?raw";
import apiAuthenticationAndDeploymentAssumptions from "./api/authentication-and-deployment-assumptions.mdx?raw";
import apiEndpoints from "./api/endpoints.mdx?raw";
import apiErrors from "./api/errors.mdx?raw";
import apiIndex from "./api/index.mdx?raw";
import apiOpenapiReference from "./api/openapi-reference.mdx?raw";
import apiOverview from "./api/overview.mdx?raw";
import conceptsCalculators from "./concepts/calculators.mdx?raw";
import conceptsDiagnostics from "./concepts/diagnostics.mdx?raw";
import conceptsFacts from "./concepts/facts.mdx?raw";
import conceptsIndex from "./concepts/index.mdx?raw";
import conceptsJurisdictionsAndTaxYears from "./concepts/jurisdictions-and-tax-years.mdx?raw";
import conceptsMoneyAndBrandedValues from "./concepts/money-and-branded-values.mdx?raw";
import conceptsReports from "./concepts/reports.mdx?raw";
import conceptsRules from "./concepts/rules.mdx?raw";
import conceptsSdkHttpApiAndCalculatorsServiceBoundary from "./concepts/sdk-http-api-and-calculators-service-boundary.mdx?raw";
import contributingAddACalculator from "./contributing/add-a-calculator.mdx?raw";
import contributingAddAFact from "./contributing/add-a-fact.mdx?raw";
import contributingAddARule from "./contributing/add-a-rule.mdx?raw";
import contributingAddATaxYear from "./contributing/add-a-tax-year.mdx?raw";
import contributingBackwardCompatibility from "./contributing/backward-compatibility.mdx?raw";
import contributingChangesets from "./contributing/changesets.mdx?raw";
import contributingEffectServiceStandards from "./contributing/effect-service-standards.mdx?raw";
import contributingFixAnIncorrectResult from "./contributing/fix-an-incorrect-result.mdx?raw";
import contributingIndex from "./contributing/index.mdx?raw";
import contributingNamingAndSchemaStandards from "./contributing/naming-and-schema-standards.mdx?raw";
import contributingPrEvidenceChecklist from "./contributing/pr-evidence-checklist.mdx?raw";
import contributingReviewExpectations from "./contributing/review-expectations.mdx?raw";
import contributingSourceCitationStandards from "./contributing/source-citation-standards.mdx?raw";
import contributingTestingStandards from "./contributing/testing-standards.mdx?raw";
import contributingWhatAreYouChanging from "./contributing/what-are-you-changing.mdx?raw";
import guidesBuildABrowserAppWithTheHttpApi from "./guides/build-a-browser-app-with-the-http-api.mdx?raw";
import guidesBuildAServerRouteWithTheSdk from "./guides/build-a-server-route-with-the-sdk.mdx?raw";
import guidesCalculateAnnualIncomeTax from "./guides/calculate-annual-income-tax.mdx?raw";
import guidesCalculateAustralianTakeHomePay from "./guides/calculate-australian-take-home-pay.mdx?raw";
import guidesHandleValidationErrors from "./guides/handle-validation-errors.mdx?raw";
import guidesIndex from "./guides/index.mdx?raw";
import guidesMigrateFromRawHttpToSdk from "./guides/migrate-from-raw-http-to-sdk.mdx?raw";
import guidesShowCalculatorHelpToUsers from "./guides/show-calculator-help-to-users.mdx?raw";
import guidesTestYourIntegration from "./guides/test-your-integration.mdx?raw";
import referenceApi from "./reference/api.mdx?raw";
import referenceChangelog from "./reference/changelog.mdx?raw";
import referenceErrors from "./reference/errors.mdx?raw";
import referenceExamples from "./reference/examples.mdx?raw";
import referenceIndex from "./reference/index.mdx?raw";
import referenceReleaseNotes from "./reference/release-notes.mdx?raw";
import referenceSchemas from "./reference/schemas.mdx?raw";
import referenceSdk from "./reference/sdk.mdx?raw";
import referenceVersioning from "./reference/versioning.mdx?raw";
import sdkEffectSdk from "./sdk/effect-sdk.mdx?raw";
import sdkIndex from "./sdk/index.mdx?raw";
import sdkPlainSdk from "./sdk/plain-sdk.mdx?raw";
import sdkSafeSdk from "./sdk/safe-sdk.mdx?raw";
import sdkSchemas from "./sdk/schemas.mdx?raw";
import sdkTypeSafety from "./sdk/type-safety.mdx?raw";
import sdkTypescriptSdk from "./sdk/typescript-sdk.mdx?raw";
import startChooseSdkOrApi from "./start/choose-sdk-or-api.mdx?raw";
import startIndex from "./start/index.mdx?raw";
import startInstallTheSdk from "./start/install-the-sdk.mdx?raw";
import startOverview from "./start/overview.mdx?raw";
import startQuickstart from "./start/quickstart.mdx?raw";
import startRunYourFirstCalculation from "./start/run-your-first-calculation.mdx?raw";

// Every authored docs page as raw text. The API's Worker build, its Bun host
// and Vitest each load `?raw` imports natively; Content checks this list
// against the navigation when it builds the catalogue.
export const docsSources = [
  { path: "start/index.mdx", text: startIndex },
  { path: "start/overview.mdx", text: startOverview },
  { path: "start/quickstart.mdx", text: startQuickstart },
  { path: "start/install-the-sdk.mdx", text: startInstallTheSdk },
  {
    path: "start/run-your-first-calculation.mdx",
    text: startRunYourFirstCalculation,
  },
  { path: "start/choose-sdk-or-api.mdx", text: startChooseSdkOrApi },
  { path: "sdk/index.mdx", text: sdkIndex },
  { path: "sdk/typescript-sdk.mdx", text: sdkTypescriptSdk },
  { path: "sdk/plain-sdk.mdx", text: sdkPlainSdk },
  { path: "sdk/safe-sdk.mdx", text: sdkSafeSdk },
  { path: "sdk/effect-sdk.mdx", text: sdkEffectSdk },
  { path: "sdk/schemas.mdx", text: sdkSchemas },
  { path: "sdk/type-safety.mdx", text: sdkTypeSafety },
  { path: "api/index.mdx", text: apiIndex },
  { path: "api/overview.mdx", text: apiOverview },
  {
    path: "api/authentication-and-deployment-assumptions.mdx",
    text: apiAuthenticationAndDeploymentAssumptions,
  },
  { path: "api/errors.mdx", text: apiErrors },
  { path: "api/openapi-reference.mdx", text: apiOpenapiReference },
  { path: "api/endpoints.mdx", text: apiEndpoints },
  { path: "api/agent-tools.mdx", text: apiAgentTools },
  { path: "guides/index.mdx", text: guidesIndex },
  {
    path: "guides/calculate-australian-take-home-pay.mdx",
    text: guidesCalculateAustralianTakeHomePay,
  },
  {
    path: "guides/calculate-annual-income-tax.mdx",
    text: guidesCalculateAnnualIncomeTax,
  },
  {
    path: "guides/handle-validation-errors.mdx",
    text: guidesHandleValidationErrors,
  },
  {
    path: "guides/show-calculator-help-to-users.mdx",
    text: guidesShowCalculatorHelpToUsers,
  },
  {
    path: "guides/build-a-server-route-with-the-sdk.mdx",
    text: guidesBuildAServerRouteWithTheSdk,
  },
  {
    path: "guides/build-a-browser-app-with-the-http-api.mdx",
    text: guidesBuildABrowserAppWithTheHttpApi,
  },
  { path: "guides/test-your-integration.mdx", text: guidesTestYourIntegration },
  {
    path: "guides/migrate-from-raw-http-to-sdk.mdx",
    text: guidesMigrateFromRawHttpToSdk,
  },
  { path: "concepts/index.mdx", text: conceptsIndex },
  { path: "concepts/calculators.mdx", text: conceptsCalculators },
  { path: "concepts/facts.mdx", text: conceptsFacts },
  { path: "concepts/rules.mdx", text: conceptsRules },
  {
    path: "concepts/jurisdictions-and-tax-years.mdx",
    text: conceptsJurisdictionsAndTaxYears,
  },
  {
    path: "concepts/money-and-branded-values.mdx",
    text: conceptsMoneyAndBrandedValues,
  },
  { path: "concepts/reports.mdx", text: conceptsReports },
  { path: "concepts/diagnostics.mdx", text: conceptsDiagnostics },
  {
    path: "concepts/sdk-http-api-and-calculators-service-boundary.mdx",
    text: conceptsSdkHttpApiAndCalculatorsServiceBoundary,
  },
  { path: "contributing/index.mdx", text: contributingIndex },
  {
    path: "contributing/what-are-you-changing.mdx",
    text: contributingWhatAreYouChanging,
  },
  { path: "contributing/add-a-fact.mdx", text: contributingAddAFact },
  { path: "contributing/add-a-rule.mdx", text: contributingAddARule },
  {
    path: "contributing/add-a-calculator.mdx",
    text: contributingAddACalculator,
  },
  { path: "contributing/add-a-tax-year.mdx", text: contributingAddATaxYear },
  {
    path: "contributing/fix-an-incorrect-result.mdx",
    text: contributingFixAnIncorrectResult,
  },
  {
    path: "contributing/testing-standards.mdx",
    text: contributingTestingStandards,
  },
  {
    path: "contributing/source-citation-standards.mdx",
    text: contributingSourceCitationStandards,
  },
  {
    path: "contributing/naming-and-schema-standards.mdx",
    text: contributingNamingAndSchemaStandards,
  },
  {
    path: "contributing/effect-service-standards.mdx",
    text: contributingEffectServiceStandards,
  },
  {
    path: "contributing/backward-compatibility.mdx",
    text: contributingBackwardCompatibility,
  },
  { path: "contributing/changesets.mdx", text: contributingChangesets },
  {
    path: "contributing/pr-evidence-checklist.mdx",
    text: contributingPrEvidenceChecklist,
  },
  {
    path: "contributing/review-expectations.mdx",
    text: contributingReviewExpectations,
  },
  { path: "reference/index.mdx", text: referenceIndex },
  { path: "reference/sdk.mdx", text: referenceSdk },
  { path: "reference/schemas.mdx", text: referenceSchemas },
  { path: "reference/errors.mdx", text: referenceErrors },
  { path: "reference/api.mdx", text: referenceApi },
  { path: "reference/examples.mdx", text: referenceExamples },
  { path: "reference/changelog.mdx", text: referenceChangelog },
  { path: "reference/versioning.mdx", text: referenceVersioning },
  { path: "reference/release-notes.mdx", text: referenceReleaseNotes },
] as const;
