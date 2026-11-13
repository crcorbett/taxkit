import { describe, expect, it } from "@effect/vitest";
import {
  CalculatorApiErrorEnvelope,
  CalculatorCatalogResponse,
  CalculatorRunResponse,
} from "@taxkit/api-http";
import { TaxKitApi } from "@taxkit/api-http/api";
import { TaxKitApiInProcessLive } from "@taxkit/api-http/in-process";
import { TaxKitApiRoutesLayer } from "@taxkit/api-http/server";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import {
  CalculatorRunRequest,
  MetadataQuery,
} from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { ContentServiceLive } from "@taxkit/content/live";
import { ContentCatalogue } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import {
  CalculationError,
  CalculationInvariantViolation,
} from "@taxkit/core/errors";
import {
  NonNegativeMoney,
  Money,
  Cents,
  fromCents,
} from "@taxkit/core/primitives";
import { AnnualTaxScenarioInputSchema } from "@taxkit/rules-au-income-tax/schemas";
import type { GrossPay } from "@taxkit/rules-au-pay";
import {
  TakeHomeScenarioInputSchema,
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "@taxkit/rules-au-pay";
import { expectAt } from "@taxkit/testing";
import {
  Predicate,
  Function as EffectFunction,
  Array,
  Effect,
  Layer,
  Match,
  Option,
  Schema,
} from "effect";
import {
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { HttpApiClient } from "effect/http-api";

import {
  AuAnnualIncomeTaxCalculation,
  AuPayTakeHomeCalculation,
} from "../src/au-effect.js";
import { calculateRun as calculateSdkRun } from "../src/effect.js";

const ContentTestLive = ContentServiceLive.pipe(
  Layer.provide(Layer.effect(ContentCatalogue, exampleContentCatalogue))
);
// The native generated client over the in-process routes.
const inProcessClient = HttpApiClient.make(TaxKitApi, {
  baseUrl: "http://taxkit.internal",
});
const PublicCalculatorServiceTestLive = PublicCalculatorServiceLive;
const TestLive = Layer.mergeAll(
  TaxKitApiInProcessLive.pipe(Layer.provide(ContentTestLive)),
  PublicCalculatorServiceTestLive
);
const takeHomeCalculatorId = AuPayTakeHomeCalculation.calculatorId;
const annualTaxCalculatorId = AuAnnualIncomeTaxCalculation.calculatorId;
const secretSentinel = "taxkit-secret-sentinel";
const privatePathSentinel = "/private/taxkit-sentinel/http-input.json";
const grossPayFacts = (
  amount: Money,
  period: GrossPay["period"],
  taxFreeThresholdClaimed: boolean
) =>
  TakeHomeScenarioInputSchema.make({
    grossPay: NonNegativeMoney.make(amount),
    period,
    taxFreeThresholdClaimed,
  });
describe("TaxKit public calculation HTTP API", () => {
  it.effect.each([
    { outcome: "caller", status: 400 },
    { outcome: "engine", status: 500 },
  ] as const)(
    "answers a $outcome calculation failure with HTTP $status",
    ({ outcome, status }) =>
      Effect.gen(function* () {
        const live = yield* PublicCalculatorService;
        const service = PublicCalculatorService.of({
          calculate: Effect.fn("PublicCalculatorService.calculate")((request) =>
            Match.value(outcome).pipe(
              Match.when("caller", () => live.calculate(request)),
              Match.when("engine", () =>
                Effect.die(
                  new CalculationInvariantViolation({
                    invariant: "report",
                    message: "Pay report invariant failed.",
                  })
                )
              ),
              Match.exhaustive
            )
          ),
          getCalculator: live.getCalculator,
          getCalculatorGraph: live.getCalculatorGraph,
          getCalculatorSchema: live.getCalculatorSchema,
          listCalculators: live.listCalculators,
          listFacts: live.listFacts,
          listJurisdictions: live.listJurisdictions,
          listRules: live.listRules,
          listTaxYears: live.listTaxYears,
        });
        // HttpApiBuilder captures services while constructing handlers.
        const handler = yield* HttpRouter.toHttpEffect(
          TaxKitApiRoutesLayer
        ).pipe(
          Effect.provide(ContentTestLive),
          Effect.provideService(PublicCalculatorService, service)
        );
        // A gross amount beyond safe cents is a scenario the rules reject.
        const unsafeGross = Money.fromCents(
          Cents.make(Number.MAX_SAFE_INTEGER)
        );
        const body = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorRunRequest)
        )({
          calculatorId: takeHomeCalculatorId,
          payload: {
            facts: grossPayFacts(unsafeGross, "weekly", true),
            jurisdiction: Option.none(),
            taxYear: Option.none(),
          },
        });
        const request = HttpClientRequest.post(
          `http://taxkit.internal/api/v2/calculators/${takeHomeCalculatorId}/calculate`
        ).pipe(HttpClientRequest.bodyText(body, "application/json"));
        const reply = yield* handler.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromClientRequest(request)
          ),
          Effect.provideService(PublicCalculatorService, service),
          // The native server's conversion of an unhandled Cause.
          Effect.catchCause((cause) =>
            HttpServerError.causeResponse(cause).pipe(
              Effect.map(([response]) => response)
            )
          ),
          Effect.map((response) =>
            HttpServerResponse.toClientResponse(response, { request })
          )
        );
        const text = yield* reply.text;
        expect(reply.status).toBe(status);
        if (outcome === "caller") {
          expect(
            yield* Schema.decodeUnknownEffect(
              Schema.fromJsonString(CalculatorApiErrorEnvelope)
            )(text)
          ).toStrictEqual({
            error: new CalculationError({
              message: "PAYG withholding could not produce a supported amount.",
              reason: "range",
            }),
          });
        } else {
          expect(text).not.toContain("CalculationError");
          expect(text).not.toContain("invariant");
        }
      }).pipe(Effect.provide(PublicCalculatorServiceTestLive), Effect.scoped)
  );
  it.effect("pins the health route fixture", () =>
    Effect.gen(function* () {
      const client = yield* inProcessClient;
      const response = yield* client.health.getHealth();
      expect(response).toStrictEqual({
        service: "taxkit",
        status: "ok",
      });
    }).pipe(Effect.provide(TestLive))
  );
  it.effect(
    "pins calculator metadata against the calculator service contract",
    () =>
      Effect.gen(function* () {
        const client = yield* inProcessClient;
        const service = yield* PublicCalculatorService;
        const context = {
          jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
          taxYear: AuPayTakeHomeCalculation.taxYear,
        };
        const query = MetadataQuery.make({
          jurisdiction: Option.some(context.jurisdiction),
          taxYear: Option.some(context.taxYear),
        });
        const response = yield* client.calculatorApi.listCalculators({
          query,
        });
        const serviceResponse = yield* service.listCalculators(query);
        const decoded = yield* Schema.decodeUnknownEffect(
          Schema.toType(CalculatorCatalogResponse)
        )(response);
        const items = EffectFunction.pipe(
          response.calculators,
          Array.filter(
            (calculator) => calculator.calculatorId === takeHomeCalculatorId
          )
        );
        const takeHomeCalculator = expectAt(items, 0);
        const receivedRepresentation = yield* Schema.encodeEffect(
          CalculatorCatalogResponse
        )(decoded);
        const serviceRepresentation = yield* Schema.encodeEffect(
          CalculatorCatalogResponse
        )(serviceResponse);
        expect(receivedRepresentation).toStrictEqual(serviceRepresentation);
        expect(takeHomeCalculator.calculatorId).toBe(takeHomeCalculatorId);
        expect({
          takeHomeCalculatorContext: takeHomeCalculator.context,
          takeHomeCalculatorInputFactIds: takeHomeCalculator.inputFactIds,
          takeHomeCalculatorReportSchemaName:
            takeHomeCalculator.reportSchemaName,
        }).toStrictEqual({
          takeHomeCalculatorContext: context,
          takeHomeCalculatorInputFactIds: [
            GrossPayDescriptor.id,
            TaxFreeThresholdClaimedDescriptor.id,
          ],
          takeHomeCalculatorReportSchemaName: "TakeHomePayReport",
        });
      }).pipe(Effect.provide(TestLive))
  );
  it.effect("pins calculate success through SDK full-run parity", () =>
    Effect.gen(function* () {
      const client = yield* inProcessClient;
      const facts = grossPayFacts(
        yield* fromCents(346_200),
        "fortnightly",
        true
      );
      const response = yield* client.calculatorApi.calculate({
        params: {
          calculatorId: takeHomeCalculatorId,
        },
        payload: {
          calculatorId: takeHomeCalculatorId,

          payload: {
            facts,
            jurisdiction: Option.some(AuPayTakeHomeCalculation.jurisdiction),
            taxYear: Option.some(AuPayTakeHomeCalculation.taxYear),
          },
        },
      });
      const sdkRun = yield* calculateSdkRun(AuPayTakeHomeCalculation, facts);
      const sdkResponse = {
        calculatorId: AuPayTakeHomeCalculation.calculatorId,
        calculator: {
          ...response.calculator,
          calculatorId: AuPayTakeHomeCalculation.calculatorId,
        },
        diagnostics: sdkRun.diagnostics,
        report: sdkRun.report,
      };
      const decoded = yield* Schema.decodeUnknownEffect(
        Schema.toType(CalculatorRunResponse)
      )(response);
      const takeHomeReport = Match.value(response.report).pipe(
        Match.tag("TakeHomePayReport", (report) => report),
        Match.orElse(() => expect.fail("Expected take-home report"))
      );
      expect({
        responseCalculatorCalculatorId: response.calculator.calculatorId,
        responseReport_tag: Predicate.isTagged(
          response.report,
          "TakeHomePayReport"
        ),
        takeHomeReportRulePackVersion: takeHomeReport.rulePackVersion,
        decoded: yield* Schema.encodeEffect(CalculatorRunResponse)(decoded),
        response: yield* Schema.encodeEffect(CalculatorRunResponse)(response),
        takeHomeReportWithholdingsTotalCents:
          takeHomeReport.withholdingsTotal.cents,
        takeHomeReportNetPayCents: takeHomeReport.netPay.cents,
        graphIssueCount: response.diagnostics.graphIssues.length,
      }).toStrictEqual({
        responseCalculatorCalculatorId: "au.pay.take-home",
        responseReport_tag: true,
        takeHomeReportRulePackVersion: "rules-au-pay/1.0.2",
        decoded: yield* Schema.encodeEffect(CalculatorRunResponse)(sdkResponse),
        response: yield* Schema.encodeEffect(CalculatorRunResponse)(
          sdkResponse
        ),
        takeHomeReportWithholdingsTotalCents: 75_600,
        takeHomeReportNetPayCents: 270_600,
        graphIssueCount: 0,
      });
      const annualTaxResponse = yield* client.calculatorApi.calculate({
        params: {
          calculatorId: annualTaxCalculatorId,
        },
        payload: {
          calculatorId: annualTaxCalculatorId,

          payload: {
            facts: AnnualTaxScenarioInputSchema.make({
              taxableIncome: NonNegativeMoney.make(
                Money.fromCents(Cents.make(9_000_000))
              ),
            }),
            jurisdiction: Option.some(AuPayTakeHomeCalculation.jurisdiction),
            taxYear: Option.some(AuPayTakeHomeCalculation.taxYear),
          },
        },
      });
      const annualReport = Match.value(annualTaxResponse.report).pipe(
        Match.tag("AnnualTaxReport", (report) => report),
        Match.orElse(() => expect.fail("Expected annual tax report"))
      );
      expect({
        annualTaxResponseReport_tag: Predicate.isTagged(
          annualTaxResponse.report,
          "AnnualTaxReport"
        ),
        annualReportRulePackVersion: annualReport.rulePackVersion,
      }).toStrictEqual({
        annualTaxResponseReport_tag: true,
        annualReportRulePackVersion: "rules-au-income-tax/1.0.1",
      });
    }).pipe(Effect.provide(TestLive))
  );
  it.effect(
    "HTTP ingress rejects extra nested facts with safe field issues",
    () =>
      Effect.gen(function* () {
        const response = yield* HttpClient.post(
          "http://taxkit.internal/api/v2/calculators/au.pay.take-home/calculate",
          {
            body: HttpBody.text(
              `{"calculatorId":"au.pay.take-home","payload":{"facts":{"grossPay":{"_tag":"Money","cents":346200,"currency":"AUD"},"period":"fortnightly","taxFreeThresholdClaimed":true,"salarySacrifice":"${secretSentinel}:${privatePathSentinel}"}}}`,
              "application/json"
            ),
          }
        );
        expect(response.status).toBe(400);
        const envelope = yield* HttpClientResponse.schemaBodyJson(
          CalculatorApiErrorEnvelope
        )(response);
        const failure = Match.value(envelope.error).pipe(
          Match.tag("InputValidationError", (error) => error),
          Match.orElse(() =>
            expect.fail("Expected safe input validation failure")
          )
        );
        expect(failure.issues.length).toBeGreaterThan(0);
        const rendered = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorApiErrorEnvelope)
        )(envelope);
        expect(rendered).not.toContain(secretSentinel);
        expect(rendered).not.toContain(privatePathSentinel);
      }).pipe(Effect.provide(TestLive))
  );
});
