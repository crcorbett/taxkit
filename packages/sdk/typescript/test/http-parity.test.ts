import { describe, expect, it } from "@effect/vitest";
import {
  CalculatorApiErrorEnvelope,
  CalculatorCatalogResponse,
  CalculatorRunResponse,
  CalculatorServiceError,
} from "@taxkit/api-http";
import { TaxKitApi } from "@taxkit/api-http/api";
import { TaxKitApiInProcessLive } from "@taxkit/api-http/in-process";
import { TaxKitApiRoutesLayer } from "@taxkit/api-http/server";
import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import {
  CalculationQuery,
  MetadataQuery,
  CalculatorOperationTimedOut,
} from "@taxkit/calculators/schemas";
import { PublicCalculatorService } from "@taxkit/calculators/service";
import { ContentServiceLive } from "@taxkit/content/live";
import { ContentCatalogue } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { CalculationEngineLive } from "@taxkit/core";
import { Money, Cents, audFromCents } from "@taxkit/core/primitives";
import {
  AuPayCalculatorId,
  GrossPay,
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "@taxkit/rules-au-pay";
import { expectAt } from "@taxkit/testing";
import {
  Predicate,
  Function as EffectFunction,
  Array,
  Cause,
  Effect,
  Exit,
  Layer,
  Match,
  Option,
  Schema,
} from "effect";
import {
  HttpClientRequest,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { HttpApiClient } from "effect/http-api";
import {
  AuAnnualIncomeTaxCalculation,
  AuPayTakeHomeCalculation,
} from "taxkit/au/effect";
import { calculateRunRequest as calculateSdkRunRequest } from "taxkit/effect";

const ContentTestLive = ContentServiceLive.pipe(
  Layer.provide(Layer.effect(ContentCatalogue, exampleContentCatalogue))
);
// The native generated client over the in-process routes.
const inProcessClient = HttpApiClient.make(TaxKitApi, {
  baseUrl: "http://taxkit.internal",
});
const PublicCalculatorServiceTestLive = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);
const TestLive = Layer.mergeAll(
  TaxKitApiInProcessLive.pipe(Layer.provide(ContentTestLive)),
  PublicCalculatorServiceTestLive
);
const takeHomeCalculatorId = AuPayCalculatorId.make("au.pay.take-home");
const annualTaxCalculatorId = AuAnnualIncomeTaxCalculation.calculatorId;
const secretSentinel = "taxkit-secret-sentinel";
const privatePathSentinel = "/private/taxkit-sentinel/http-input.json";
const grossPayFacts = (
  amount: Money,
  period: GrossPay["period"],
  taxFreeThresholdClaimed: boolean
) => ({
  grossPay: new GrossPay({ amount, period }),
  taxFreeThresholdClaimed,
});
describe("TaxKit public calculation HTTP API", () => {
  it.effect.each([
    "/api/v1/jurisdictions",
    "/api/v1/tax-years",
    "/api/v1/calculators",
    "/api/v1/calculators/au.pay.take-home",
    "/api/v1/calculators/au.pay.take-home/schema",
    "/api/v1/calculators/au.pay.take-home/graph",
    "/api/v1/facts",
    "/api/v1/rules",
  ])("declares and encodes a checked metadata timeout at %s", (pathname) =>
    Effect.gen(function* () {
      const live = yield* PublicCalculatorService;
      const service = Layer.succeed(
        PublicCalculatorService,
        PublicCalculatorService.of({
          calculate: Effect.fn("PublicCalculatorService.calculate")(
            live.calculate
          ),
          getCalculator: Effect.fn("PublicCalculatorService.getCalculator")(
            () => Effect.fail(new CalculatorOperationTimedOut())
          ),
          getCalculatorGraph: Effect.fn(
            "PublicCalculatorService.getCalculatorGraph"
          )(() => Effect.fail(new CalculatorOperationTimedOut())),
          getCalculatorSchema: Effect.fn(
            "PublicCalculatorService.getCalculatorSchema"
          )(() => Effect.fail(new CalculatorOperationTimedOut())),
          listCalculators: Effect.fn("PublicCalculatorService.listCalculators")(
            () => Effect.fail(new CalculatorOperationTimedOut())
          ),
          listFacts: Effect.fn("PublicCalculatorService.listFacts")(() =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          listJurisdictions: Effect.fn(
            "PublicCalculatorService.listJurisdictions"
          )(() => Effect.fail(new CalculatorOperationTimedOut())),
          listRules: Effect.fn("PublicCalculatorService.listRules")(() =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
          listTaxYears: Effect.fn("PublicCalculatorService.listTaxYears")(() =>
            Effect.fail(new CalculatorOperationTimedOut())
          ),
        })
      );
      // HttpApiBuilder captures services while constructing handlers. Supply
      // the controlled implementation there, rather than a later request override.
      const handler = yield* HttpRouter.toHttpEffect(TaxKitApiRoutesLayer).pipe(
        Effect.provide(ContentTestLive),
        Effect.provide(service)
      );
      const request = HttpClientRequest.get(
        `http://taxkit.internal${pathname}`
      );
      const response = yield* handler.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromClientRequest(request)
        )
      );
      expect({
        responseStatus: response.status,
        errorEnvelope: yield* Schema.decodeUnknownEffect(
          CalculatorApiErrorEnvelope
        )(
          yield* HttpServerResponse.toClientResponse(response, { request }).json
        ),
      }).toStrictEqual({
        responseStatus: 504,
        errorEnvelope: { error: new CalculatorOperationTimedOut() },
      });
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
          jurisdiction: Option.some(Option.some(context.jurisdiction)),
          taxYear: Option.some(Option.some(context.taxYear)),
        });
        const response = yield* client.calculatorApi.listCalculators({
          query,
        });
        const serviceResponse = yield* service.listCalculators(query);
        const decoded = yield* Schema.decodeUnknownEffect(
          Schema.toType(CalculatorCatalogResponse)
        )(response);
        const takeHomeCalculator = EffectFunction.pipe(
          EffectFunction.pipe(
            response.calculators,
            Array.filter(
              (calculator) => calculator.calculatorId === takeHomeCalculatorId
            )
          ),
          (argument1) =>
            EffectFunction.pipe(0, (argument2) =>
              expectAt(argument1, argument2)
            )
        );
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
        yield* audFromCents(346_200),
        "fortnightly",
        true
      );
      const response = yield* client.calculatorApi.calculate({
        params: {
          calculatorId: takeHomeCalculatorId,
        },
        payload: {
          facts,
          jurisdiction: Option.some(
            Option.some(AuPayTakeHomeCalculation.jurisdiction)
          ),
          taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
        },
        query: {
          help: Option.some(Option.some("errors")),
        },
      });
      const sdkResponse = yield* calculateSdkRunRequest(
        AuPayTakeHomeCalculation,
        {
          payload: {
            facts,
            jurisdiction: Option.some(
              Option.some(AuPayTakeHomeCalculation.jurisdiction)
            ),
            taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
          },
        }
      );
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
        length: response.diagnostics.graphIssues.length,
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
        length: 0,
      });
      const annualTaxResponse = yield* client.calculatorApi.calculate({
        params: {
          calculatorId: annualTaxCalculatorId,
        },
        payload: {
          facts: {
            taxableIncome: new Money({
              cents: Cents.make(9_000_000),
              currency: "AUD",
            }),
          },
          jurisdiction: Option.some(
            Option.some(AuPayTakeHomeCalculation.jurisdiction)
          ),
          taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
        },
        query: CalculationQuery.make({}),
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
    "returns typed calculator input errors through the HTTP client",
    () =>
      Effect.gen(function* () {
        const client = yield* inProcessClient;
        const service = yield* PublicCalculatorService;
        const invalidFacts = {
          rejectedSource: `${secretSentinel}:${privatePathSentinel}`,
          taxableIncome: new Money({
            cents: Cents.make(9_000_000),
            currency: "AUD",
          }),
        };
        const exit = yield* client.calculatorApi
          .calculate({
            params: {
              calculatorId: takeHomeCalculatorId,
            },
            payload: {
              facts: invalidFacts,
              jurisdiction: Option.some(
                Option.some(AuPayTakeHomeCalculation.jurisdiction)
              ),
              taxYear: Option.some(
                Option.some(AuPayTakeHomeCalculation.taxYear)
              ),
            },
            query: {
              help: Option.some(Option.some("errors")),
            },
          })
          .pipe(Effect.exit);
        const sdkExit = yield* calculateSdkRunRequest(
          AuPayTakeHomeCalculation,
          {
            help: Option.some(Option.some("errors")),
            payload: {
              // @ts-expect-error runtime parity covers invalid external input after the typed boundary is bypassed.
              facts: invalidFacts,
              jurisdiction: Option.some(
                Option.some(AuPayTakeHomeCalculation.jurisdiction)
              ),
              taxYear: Option.some(
                Option.some(AuPayTakeHomeCalculation.taxYear)
              ),
            },
          }
        ).pipe(Effect.exit);
        const serviceExit = yield* service
          .calculate({
            calculatorId: takeHomeCalculatorId,
            help: Option.some(Option.some("errors")),
            payload: {
              facts: invalidFacts,
              jurisdiction: Option.some(
                Option.some(AuPayTakeHomeCalculation.jurisdiction)
              ),
              taxYear: Option.some(
                Option.some(AuPayTakeHomeCalculation.taxYear)
              ),
            },
          })
          .pipe(Effect.exit);
        const httpCause = yield* Exit.match(exit, {
          onFailure: Effect.succeed,
          onSuccess: () =>
            Effect.die(
              new Error("Expected the HTTP calculate fixture to fail")
            ),
        });
        const sdkCause = yield* Exit.match(sdkExit, {
          onFailure: Effect.succeed,
          onSuccess: () =>
            Effect.die(new Error("Expected the SDK calculate fixture to fail")),
        });
        const serviceCause = yield* Exit.match(serviceExit, {
          onFailure: Effect.succeed,
          onSuccess: () =>
            Effect.die(
              new Error("Expected the calculator service fixture to fail")
            ),
        });
        const failure = EffectFunction.pipe(
          EffectFunction.pipe(
            httpCause.reasons,
            Array.filter(Cause.isFailReason)
          ),
          (argument3) =>
            EffectFunction.pipe(0, (argument4) =>
              expectAt(argument3, argument4)
            )
        );
        const sdkFailure = EffectFunction.pipe(
          EffectFunction.pipe(
            sdkCause.reasons,
            Array.filter(Cause.isFailReason)
          ),
          (argument5) =>
            EffectFunction.pipe(0, (argument6) =>
              expectAt(argument5, argument6)
            )
        );
        const serviceFailure = EffectFunction.pipe(
          EffectFunction.pipe(
            serviceCause.reasons,
            Array.filter(Cause.isFailReason)
          ),
          (argument7) =>
            EffectFunction.pipe(0, (argument8) =>
              expectAt(argument7, argument8)
            )
        );
        const envelope = yield* Schema.decodeUnknownEffect(
          Schema.toType(CalculatorApiErrorEnvelope)
        )(failure.error);
        const decodedCalculatorError = yield* Schema.decodeUnknownEffect(
          Schema.toType(CalculatorServiceError)
        )(envelope.error);
        const calculatorError = Match.value(decodedCalculatorError).pipe(
          Match.tag("CalculatorInputDecodeError", (error) => error),
          Match.orElse(() => expect.fail("Expected calculator input error"))
        );
        const inputHelp = calculatorError.help.pipe(
          Option.flatten,
          Option.match({
            onNone: Array.empty,
            onSome: (help) => help,
          })
        );
        EffectFunction.pipe(Exit.isFailure(exit), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(Exit.isFailure(sdkExit), (actual) => {
          expect(actual).toBeTruthy();
        });
        EffectFunction.pipe(Exit.isFailure(serviceExit), (actual) => {
          expect(actual).toBeTruthy();
        });
        expect({
          calculatorError,
          calculatorError2: calculatorError,
          calculatorError_tag: Predicate.isTagged(
            calculatorError,
            "CalculatorInputDecodeError"
          ),
          expectAtCalculatorErrorIssues0Path: expectAt(
            calculatorError.issues,
            0
          ).path,
          expectAtCalculatorErrorIssues0Message: expectAt(
            calculatorError.issues,
            0
          ).message,
        }).toStrictEqual({
          calculatorError: sdkFailure.error,
          calculatorError2: serviceFailure.error,
          calculatorError_tag: true,
          expectAtCalculatorErrorIssues0Path: ["grossPay"],
          expectAtCalculatorErrorIssues0Message:
            "Invalid calculator input value",
        });
        expect(expectAt(inputHelp, 0).factId).toBe(GrossPayDescriptor.id);
        const serializedEnvelope = yield* Schema.encodeEffect(
          Schema.fromJsonString(CalculatorApiErrorEnvelope)
        )(envelope);
        expect(serializedEnvelope).not.toContain(secretSentinel);
        expect(serializedEnvelope).not.toContain(privatePathSentinel);
      }).pipe(Effect.provide(TestLive))
  );
});
